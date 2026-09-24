// All schedule times are wall-clock times in the academy's timezone.
export const ACADEMY_TZ = process.env.ACADEMY_TIMEZONE ?? "Asia/Dubai";

const DAY_MS = 86_400_000;

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Monday ... 6 = Sunday
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ACADEMY_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function zonedParts(date: Date): ZonedParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: WEEKDAYS.indexOf(map.weekday),
  };
}

function offsetMs(ts: number): number {
  const p = zonedParts(new Date(ts));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(ts / 60_000) * 60_000;
}

/** The instant at which the academy clock reads the given wall time. */
export function wallTime(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(guess);
  // Re-check once so times near a DST switch land on the right offset.
  return new Date(guess - offsetMs(first));
}

/** Midnight (academy time) of the day containing `date`. */
export function startOfDay(date: Date): Date {
  const p = zonedParts(date);
  return wallTime(p.year, p.month, p.day);
}

/** Midnight of the Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const p = zonedParts(date);
  return wallTime(p.year, p.month, p.day - p.weekday);
}

/** `base` shifted by whole calendar days, at an optional wall-clock time. */
export function addDays(base: Date, days: number, hhmm?: string): Date {
  const p = zonedParts(base);
  const [h, m] = hhmm ? hhmm.split(":").map(Number) : [p.hour, p.minute];
  return wallTime(p.year, p.month, p.day + days, h, m);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

export function sameDay(a: Date, b: Date): boolean {
  return daysBetween(a, b) === 0;
}

function fmt(date: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: ACADEMY_TZ, ...opts }).format(date);
}

export const formatTime = (d: Date) => fmt(d, { hour: "2-digit", minute: "2-digit" });
export const formatDate = (d: Date) => fmt(d, { day: "numeric", month: "long" });
export const formatShortDate = (d: Date) => fmt(d, { day: "numeric", month: "short" });
export const formatWeekday = (d: Date) => fmt(d, { weekday: "long" });
export const formatMonthYear = (d: Date) => fmt(d, { month: "long", year: "numeric" });
export const formatFull = (d: Date) =>
  fmt(d, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** "Today", "Tomorrow", "Friday", or "12 October" relative to `now`. */
export function relativeDay(date: Date, now: Date): string {
  const diff = daysBetween(now, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return formatWeekday(date);
  return formatDate(date);
}

export function timeAgo(date: Date, now: Date): string {
  const mins = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(date);
}

export function greeting(now: Date): string {
  const h = zonedParts(now).hour;
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
