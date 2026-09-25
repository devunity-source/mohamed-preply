import clsx from "clsx";
import { Avatar } from "@/components/ui";
import type { MessageView, OfficeStatus } from "@/lib/data/office-hours";
import { translator, type Key, type T } from "@/lib/i18n/translate";
import { activeLocale, daysBetween, formatTime, formatWeekday, timeAgo, zonedParts } from "@/lib/time";
import type { OfficeHoursSlot } from "@/lib/types";

// Server-only helpers (no "use client"). `t` is optional so existing callers
// keep working; without it they follow the request's language.
const requestT = (): T => translator(activeLocale());

/** Monday first, matching OfficeHoursSlot.weekday (0 = Monday). */
const WEEKDAYS: Key[] = [
  "officeHours.monday",
  "officeHours.tuesday",
  "officeHours.wednesday",
  "officeHours.thursday",
  "officeHours.friday",
  "officeHours.saturday",
  "officeHours.sunday",
];

/** "Open now until 17:00" or "Closed. Opens Monday at 08:00." */
export function officeStatusText(
  status: OfficeStatus,
  now: Date,
  t: T = requestT(),
): { title: string; detail: string } {
  if (!status.hasSchedule) return { title: t("officeHours.noHoursTitle"), detail: t("officeHours.noHoursDetail") };
  if (status.open)
    return { title: t("officeHours.openNow"), detail: t("officeHours.until", { time: status.closesAt ?? "" }) };
  if (status.next) {
    const at = status.next.at;
    const time = formatTime(at);
    const diff = daysBetween(now, at);
    const detail =
      diff === 0
        ? t("officeHours.opensToday", { time })
        : diff === 1
          ? t("officeHours.opensTomorrow", { time })
          : t("officeHours.opensOn", { day: formatWeekday(at), time });
    return { title: t("officeHours.closed"), detail };
  }
  return { title: t("officeHours.closed"), detail: "" };
}

export function OfficeStatusBanner({ status, now, t = requestT() }: { status: OfficeStatus; now: Date; t?: T }) {
  const { title, detail } = officeStatusText(status, now, t);
  return (
    <div
      className={clsx(
        "flex items-center gap-4 rounded-md border p-5",
        status.open ? "border-k-office/40 bg-k-office/10" : "border-line bg-line/40",
      )}
    >
      <span className={clsx("size-3 shrink-0 rounded-full", status.open ? "bg-k-office" : "bg-muted/60")} aria-hidden />
      <div>
        <p className="text-xl font-semibold tracking-tight">{title}</p>
        {detail && <p className="text-sm text-muted">{detail}</p>}
      </div>
    </div>
  );
}

export function WeeklySchedule({ slots, now, t = requestT() }: { slots: OfficeHoursSlot[]; now: Date; t?: T }) {
  const today = zonedParts(now).weekday;
  return (
    <ul className="divide-y divide-line">
      {WEEKDAYS.map((day, i) => {
        const slot = slots.find((s) => s.weekday === i);
        return (
          <li key={day} className={clsx("flex justify-between gap-4 py-2 text-sm", i === today && "font-semibold")}>
            <span>{t(day)}</span>
            <span className={clsx("tabular-nums", !slot && "text-muted")}>
              {slot ? t("officeHours.slotRange", { start: slot.start, end: slot.end }) : t("officeHours.closed")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function Conversation({ messages, viewerId, now }: { messages: MessageView[]; viewerId: string; now: Date }) {
  return (
    <ol className="space-y-4">
      {messages.map((m) => (
        <li key={m.id} className={clsx("flex gap-3", m.authorId === viewerId && "flex-row-reverse text-end")}>
          <Avatar profile={m.author} size={32} />
          <div
            className={clsx(
              "max-w-[80%] rounded-md border p-3 text-start",
              m.authorId === viewerId ? "border-ink/15 bg-paper" : "border-line bg-surface",
            )}
          >
            <p className="mb-1 text-xs text-muted">
              <span className="font-medium text-ink">{m.author.fullName}</span> {timeAgo(m.createdAt, now)}
            </p>
            <p dir="auto" className="text-sm leading-relaxed whitespace-pre-wrap">
              {m.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
