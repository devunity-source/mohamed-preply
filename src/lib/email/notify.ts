import "server-only";
import { db } from "@/lib/data/store";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/server";
import { unsubscribeLinks } from "./links";
import { sendLater } from "./send";
import { activityEmail } from "./templates";
import type { EmailKind } from "@/lib/types";

export type ActivityKind = EmailKind | "cohort";

const WHY: Record<ActivityKind, string> = {
  grades: "You get these when your work is graded or reviewed, or a certificate is issued.",
  community: "You get these when someone mentions you or comments on your post.",
  office_hours: "You get these for office hours messages.",
  reminders: "You get these as reminders for classes and work that's due.",
  cohort: "You get these when you join a cohort or start teaching one.",
};

export interface Recipient {
  email: string;
  firstName: string;
  off: EmailKind[];
}

/**
 * Who to email and what they turned off. Demo mode knows now. With Supabase
 * the person acting can't read someone else's address or settings (and
 * shouldn't), so the server looks them up with the secret key, later, when
 * the email is built.
 */
export function recipient(userId: string): () => Promise<Recipient | null> {
  const s = db();
  const firstName = s.profiles.find((p) => p.id === userId)?.fullName.split(" ")[0] ?? "there";
  if (!supabaseEnabled()) {
    const email = s.accounts.find((a) => a.userId === userId)?.email;
    const off = s.emailPrefs.find((p) => p.userId === userId)?.off ?? [];
    return async () => (email ? { email, firstName, off } : null);
  }
  return async () => {
    const admin = createAdminClient();
    if (!admin) throw new Error("SUPABASE_SECRET_KEY is needed to look up email addresses");
    const [{ data: user }, { data: prefs }] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from("email_preferences").select("off").eq("user_id", userId).maybeSingle(),
    ]);
    const email = user?.user?.email;
    return email ? { email, firstName, off: (prefs?.off ?? []) as EmailKind[] } : null;
  };
}

/** Emails an in-app notification, unless the person turned that kind off. */
export function emailActivity(userId: string, text: string, href: string, kind: ActivityKind): void {
  const who = recipient(userId);
  sendLater(async () => {
    const r = await who();
    if (!r || (kind !== "cohort" && r.off.includes(kind))) return null;
    const links = kind === "cohort" ? null : unsubscribeLinks(userId, kind);
    return {
      to: r.email,
      tag: kind,
      ...activityEmail({ firstName: r.firstName, text, href, why: WHY[kind], unsubscribe: links?.page }),
      headers: links
        ? { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    };
  });
}
