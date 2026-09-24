import Link from "next/link";
import clsx from "clsx";
import { Avatar, Card, Empty } from "@/components/ui";
import { ActionForm } from "@/components/admin-forms";
import { MarkThreadRead, OfficeReplyForm } from "@/components/office-hours";
import { Conversation, OfficeStatusBanner } from "@/components/office-hours-view";
import { WEEKDAY_NAMES, inboxFor, messagesIn, officeHoursFor, officeStatus, threadFor } from "@/lib/data/office-hours";
import { replyOfficeMessage, saveOfficeHours } from "@/lib/admin-actions";
import { requireCohortManager } from "@/lib/authz";
import { formatWeekday, timeAgo, wallTime } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";

const timeField =
  "w-full min-w-0 rounded-md border border-line bg-paper px-2 py-1.5 text-sm tabular-nums outline-none focus:border-ink";

export default async function OfficeHoursAdmin({
  params,
  searchParams,
}: PageProps<"/admin/cohorts/[cohortId]/office-hours">) {
  const { t, locale } = await getI18n();
  const { cohortId } = await params;
  const { student } = await searchParams;
  const user = await requireCohortManager(cohortId);
  const now = new Date();
  const slots = officeHoursFor(cohortId);
  const status = officeStatus(cohortId, now);
  const inbox = inboxFor(cohortId);
  const selected = inbox.find((r) => r.student.id === student) ?? inbox[0];
  const thread = selected ? threadFor(cohortId, selected.student.id) : undefined;
  const messages = thread ? messagesIn(thread.id) : [];

  return (
    <div className="grid grid-cols-1 gap-5 min-[1400px]:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
      <Card title={t("teaching.inboxTitle", { count: inbox.length })}>
        {inbox.length === 0 ? (
          <Empty>{t("teaching.inboxEmpty")}</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[14rem_1fr] [&>*]:min-w-0">
            <ul className="-mx-2">
              {inbox.map((r) => {
                const active = r.student.id === selected?.student.id;
                return (
                  <li key={r.thread.id}>
                    <Link
                      href={`?student=${r.student.id}`}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm",
                        active ? "bg-ink text-paper" : "hover:bg-line/60",
                      )}
                    >
                      <Avatar profile={r.student} size={24} />
                      <span className="min-w-0 flex-1">
                        <span className={clsx("block truncate", r.unread && "font-semibold")}>
                          {r.student.fullName}
                        </span>
                        <span className="block text-xs opacity-70">{timeAgo(r.thread.lastMessageAt, now)}</span>
                      </span>
                      {r.unread && (
                        <span className="size-2 shrink-0 rounded-full bg-accent" aria-label={t("teaching.unread")} />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {thread && selected && (
              <div className="space-y-5">
                <MarkThreadRead threadId={thread.id} latestId={messages.at(-1)?.id} unread={selected.unread} />
                <p className="font-semibold">{selected.student.fullName}</p>
                <Conversation messages={messages} viewerId={user.id} now={now} />
                <OfficeReplyForm key={thread.id} action={replyOfficeMessage} threadId={thread.id} />
              </div>
            )}
          </div>
        )}
      </Card>
      <div className="space-y-5">
        <OfficeStatusBanner status={status} now={now} />
        <Card title={t("teaching.weeklyHours")}>
          <p className="mb-4 text-sm text-muted">{t("teaching.weeklyHoursHelp")}</p>
          <ActionForm action={saveOfficeHours} submitLabel={t("teaching.saveHours")}>
            <input type="hidden" name="cohortId" value={cohortId} />
            <ul className="divide-y divide-line">
              {WEEKDAY_NAMES.map((name, i) => {
                // 1 January 2024 was a Monday, like WEEKDAY_NAMES[0].
                const day = locale === "en" ? name : formatWeekday(wallTime(2024, 1, 1 + i, 12), locale);
                const slot = slots.find((s) => s.weekday === i);
                return (
                  <li key={name} className="grid grid-cols-[6.5rem_7.5rem_auto_7.5rem] items-center gap-2 py-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name={`on:${i}`} defaultChecked={!!slot} className="accent-[var(--ink)]" />
                      {day}
                    </label>
                    <label className="text-sm">
                      <span className="sr-only">{t("teaching.dayStart", { day })}</span>
                      <input
                        type="time"
                        name={`start:${i}`}
                        defaultValue={slot?.start ?? "08:00"}
                        className={timeField}
                      />
                    </label>
                    <span className="text-sm text-muted">{t("teaching.timeTo")}</span>
                    <label className="text-sm">
                      <span className="sr-only">{t("teaching.dayEnd", { day })}</span>
                      <input type="time" name={`end:${i}`} defaultValue={slot?.end ?? "17:00"} className={timeField} />
                    </label>
                  </li>
                );
              })}
            </ul>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
