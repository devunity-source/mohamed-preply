import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonLink, Card, Empty, KindMark, Legend, PageHeader } from "@/components/ui";
import { calendarFor, type CalendarItem } from "@/lib/data/repo";
import type { CalendarKind } from "@/lib/types";
import { getI18n } from "@/lib/i18n/server";
import { currentUser } from "@/lib/session";
import {
  addDays,
  formatFull,
  formatMonthYear,
  formatTime,
  formatWeekday,
  formatDate,
  wallTime,
  zonedParts,
} from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("calendar.metaTitle") };
}

const WEEKDAYS = [
  "calendar.mon",
  "calendar.tue",
  "calendar.wed",
  "calendar.thu",
  "calendar.fri",
  "calendar.sat",
  "calendar.sun",
] as const;

const KIND_LABEL = {
  class: "calendar.kindClass",
  lab: "calendar.kindLab",
  office_hours: "calendar.kindOfficeHours",
  workshop: "calendar.kindWorkshop",
  deadline: "calendar.kindDeadline",
  event: "calendar.kindEvent",
} as const satisfies Record<CalendarKind, string>;

const key = (d: Date) => {
  const p = zonedParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

function parseMonth(m: string | undefined, now: Date) {
  const match = m?.match(/^(\d{4})-(\d{2})$/);
  if (match) return { year: Number(match[1]), month: Number(match[2]) };
  const p = zonedParts(now);
  return { year: p.year, month: p.month };
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const user = await currentUser();
  const now = new Date();
  const { year, month } = parseMonth(typeof sp.m === "string" ? sp.m : undefined, now);

  const first = wallTime(year, month, 1);
  const gridStart = addDays(first, -zonedParts(first).weekday, "00:00");
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i, "00:00"));
  const items = calendarFor(user.id, gridStart, addDays(gridStart, 42, "00:00"));
  const byDay = new Map<string, CalendarItem[]>();
  for (const it of items) byDay.set(key(it.startsAt), [...(byDay.get(key(it.startsAt)) ?? []), it]);

  const todayKey = key(now);
  const selectedKey = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : todayKey;
  const [sy, sm, sd] = selectedKey.split("-").map(Number);
  const selectedDate = wallTime(sy, sm, sd);
  const selected = byDay.get(selectedKey) ?? calendarFor(user.id, selectedDate, addDays(selectedDate, 1, "00:00"));

  const monthParam = (offset: number) => {
    const d = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const thisMonth = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <>
      <PageHeader eyebrow={t("calendar.eyebrow")} title={formatMonthYear(first)}>
        <div className="flex items-center gap-2">
          <ButtonLink href={`/calendar?m=${monthParam(-1)}`} variant="ghost" className="px-2.5">
            <ChevronLeft size={16} className="rtl:-scale-x-100" />
            <span className="sr-only">{t("calendar.previousMonth")}</span>
          </ButtonLink>
          <ButtonLink href="/calendar" variant="ghost">
            {t("calendar.today")}
          </ButtonLink>
          <ButtonLink href={`/calendar?m=${monthParam(1)}`} variant="ghost" className="px-2.5">
            <ChevronRight size={16} className="rtl:-scale-x-100" />
            <span className="sr-only">{t("calendar.nextMonth")}</span>
          </ButtonLink>
        </div>
      </PageHeader>
      <Legend className="mb-5" />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-md border border-line bg-line">
          <div className="grid grid-cols-7 gap-px">
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-surface px-2 py-2 font-mono text-[11px] tracking-wider text-muted uppercase">
                {t(d)}
              </div>
            ))}
            {days.map((d) => {
              const k = key(d);
              const p = zonedParts(d);
              const inMonth = p.month === month;
              const dayItems = byDay.get(k) ?? [];
              return (
                <Link
                  key={k}
                  href={`/calendar?m=${thisMonth}&d=${k}`}
                  scroll={false}
                  className={clsx(
                    "min-h-16 bg-surface p-1.5 transition-colors hover:bg-paper md:min-h-28 md:p-2",
                    !inMonth && "opacity-40",
                    k === selectedKey && "ring-2 ring-ink ring-inset",
                  )}
                >
                  <span
                    className={clsx(
                      "inline-flex size-6 items-center justify-center rounded-[4px] font-mono text-xs",
                      k === todayKey && "bg-accent font-semibold text-accent-ink",
                    )}
                  >
                    {p.day}
                  </span>
                  <ul className="mt-1 hidden space-y-1 md:block">
                    {dayItems.slice(0, 3).map((it) => (
                      <li key={it.id} className="flex items-center gap-1 truncate text-[11px] leading-tight">
                        <KindMark kind={it.kind} />
                        <span className="truncate">{it.title}</span>
                      </li>
                    ))}
                    {dayItems.length > 3 && (
                      <li className="text-[11px] text-muted">{t("calendar.more", { count: dayItems.length - 3 })}</li>
                    )}
                  </ul>
                  <div className="mt-1 flex gap-0.5 md:hidden">
                    {dayItems.map((it) => (
                      <KindMark key={it.id} kind={it.kind} />
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <Card title={`${formatWeekday(selectedDate)} · ${formatDate(selectedDate)}`}>
          {selected.length === 0 ? (
            <Empty>{t("calendar.nothingScheduled")}</Empty>
          ) : (
            <ul className="space-y-5">
              {selected.map((it) => (
                <li key={it.id}>
                  <p className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted uppercase">
                    <KindMark kind={it.kind} /> {t(KIND_LABEL[it.kind])}
                  </p>
                  <p className="mt-1 font-medium">{it.title}</p>
                  <p className="font-mono text-xs text-muted">
                    {it.durationMin
                      ? t("calendar.timeRange", {
                          start: formatTime(it.startsAt),
                          end: formatTime(new Date(it.startsAt.getTime() + it.durationMin * 60_000)),
                        })
                      : formatFull(it.startsAt)}
                  </p>
                  {it.href && (
                    <Link href={it.href} className="mt-2 inline-block text-sm font-medium hover:text-accent">
                      {it.kind === "class" ? t("calendar.openClassroom") : t("calendar.open")}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
