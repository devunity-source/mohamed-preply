import { timingSafeEqual } from "node:crypto";
import { db, withServiceData } from "@/lib/data/store";
import { insert } from "@/lib/data/save";
import { recipient } from "@/lib/email/notify";
import { unsubscribeLinks } from "@/lib/email/links";
import { sendLater } from "@/lib/email/send";
import { classReminderEmail } from "@/lib/email/templates";
import { formatTime } from "@/lib/time";

// Scheduled job: email each student before their live class. Call it every
// 15 minutes with `Authorization: Bearer <CRON_SECRET>` (see
// docs/email-setup.md). Each class reminds each person once, however often
// the job runs, and people who turned reminders off are skipped.

const WINDOW_MS = 60 * 60_000;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return (
    secret.length >= 24 &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  );
}

export const GET = async (req: Request) => {
  if (!authorised(req)) return new Response("Not found", { status: 404 });
  return Response.json(await remind(new Date()));
};

const remind = withServiceData(async (now: Date) => {
  const s = db();
  const soon = s.classes.filter((c) => c.startsAt > now && c.startsAt.getTime() - now.getTime() <= WINDOW_MS);
  let queued = 0;
  for (const cls of soon) {
    const students = s.cohortMembers.filter((m) => m.cohortId === cls.cohortId && m.role === "student");
    for (const { userId } of students) {
      if (s.remindersSent.some((r) => r.classId === cls.id && r.userId === userId)) continue;
      // Recorded first: a crash mid-run can skip a reminder, never send one twice.
      await insert("remindersSent", { classId: cls.id, userId, sentAt: now }, { privileged: true });
      const who = recipient(userId);
      const href = `/cohorts/${cls.cohortId}/classes/${cls.id}`;
      sendLater(async () => {
        const r = await who();
        if (!r || r.off.includes("reminders")) return null;
        const links = unsubscribeLinks(userId, "reminders");
        return {
          to: r.email,
          tag: "class_reminder",
          idempotencyKey: `class-reminder-${cls.id}-${userId}`,
          headers: { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          ...classReminderEmail({
            firstName: r.firstName,
            title: cls.title,
            when: formatTime(cls.startsAt),
            href,
            unsubscribe: links.page,
          }),
        };
      });
      queued++;
    }
  }
  return { classes: soon.length, reminders: queued };
});
