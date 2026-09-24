import clsx from "clsx";
import { Avatar } from "@/components/ui";
import { WEEKDAY_NAMES, type MessageView, type OfficeStatus } from "@/lib/data/office-hours";
import { formatTime, formatWeekday, relativeDay, timeAgo, zonedParts } from "@/lib/time";
import type { OfficeHoursSlot } from "@/lib/types";

/** "Open now until 17:00" or "Closed. Opens Monday at 08:00." */
export function officeStatusText(status: OfficeStatus, now: Date): { title: string; detail: string } {
  if (!status.hasSchedule) return { title: "No office hours yet", detail: "Your instructor hasn't set any." };
  if (status.open) return { title: "Open now", detail: `Until ${status.closesAt}, UAE time` };
  if (status.next) {
    const day = relativeDay(status.next.at, now);
    const when = /today|tomorrow/i.test(day) ? day.toLowerCase() : formatWeekday(status.next.at);
    return { title: "Closed", detail: `Opens ${when} at ${formatTime(status.next.at)}` };
  }
  return { title: "Closed", detail: "" };
}

export function OfficeStatusBanner({ status, now }: { status: OfficeStatus; now: Date }) {
  const { title, detail } = officeStatusText(status, now);
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

export function WeeklySchedule({ slots, now }: { slots: OfficeHoursSlot[]; now: Date }) {
  const today = zonedParts(now).weekday;
  return (
    <ul className="divide-y divide-line">
      {WEEKDAY_NAMES.map((day, i) => {
        const slot = slots.find((s) => s.weekday === i);
        return (
          <li key={day} className={clsx("flex justify-between gap-4 py-2 text-sm", i === today && "font-semibold")}>
            <span>{day}</span>
            <span className={clsx("tabular-nums", !slot && "text-muted")}>
              {slot ? `${slot.start} to ${slot.end}` : "Closed"}
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
        <li key={m.id} className={clsx("flex gap-3", m.authorId === viewerId && "flex-row-reverse text-right")}>
          <Avatar profile={m.author} size={32} />
          <div
            className={clsx(
              "max-w-[80%] rounded-md border p-3 text-left",
              m.authorId === viewerId ? "border-ink/15 bg-paper" : "border-line bg-surface",
            )}
          >
            <p className="mb-1 text-xs text-muted">
              <span className="font-medium text-ink">{m.author.fullName}</span> {timeAgo(m.createdAt, now)}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
