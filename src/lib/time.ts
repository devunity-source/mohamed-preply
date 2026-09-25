import { intlLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/types";

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

// Formatting follows the request's language (src/lib/i18n/server.ts registers
// how to find it); code outside a request can pass one explicitly.
let currentLocale: () => Locale = () => "en";
export function registerLocale(resolve: () => Locale) {
  currentLocale = resolve;
}
/** The language formatting uses right now (the request's, on the server). */
export const activeLocale = () => currentLocale();

function fmt(date: Date, opts: Intl.DateTimeFormatOptions, locale = currentLocale()): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: ACADEMY_TZ, ...opts }).format(date);
}

type L = Locale | undefined;
export const formatTime = (d: Date, l?: L) => fmt(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, l);
export const formatDate = (d: Date, l?: L) => fmt(d, { day: "numeric", month: "long" }, l);
export const formatShortDate = (d: Date, l?: L) => fmt(d, { day: "numeric", month: "short" }, l);
export const formatWeekday = (d: Date, l?: L) => fmt(d, { weekday: "long" }, l);
export const formatMonthYear = (d: Date, l?: L) => fmt(d, { month: "long", year: "numeric" }, l);
export const formatFull = (d: Date, l?: L) =>
  fmt(d, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, l);

/** "Today", "Tomorrow", "Friday", or "12 October" relative to `now`. */
export function relativeDay(date: Date, now: Date, l?: L): string {
  const locale = l ?? currentLocale();
  const diff = daysBetween(now, date);
  if (diff === 0) return translate(locale, "common.today");
  if (diff === 1) return translate(locale, "common.tomorrow");
  if (diff === -1) return translate(locale, "common.yesterday");
  if (diff > 1 && diff < 7) return formatWeekday(date, locale);
  return formatDate(date, locale);
}

export function timeAgo(date: Date, now: Date, l?: L): string {
  const locale = l ?? currentLocale();
  const mins = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (mins < 1) return translate(locale, "common.justNow");
  if (mins < 60) return translate(locale, "common.minutesAgo", { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return translate(locale, "common.hoursAgo", { count: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return translate(locale, "common.daysAgo", { count: days });
  return formatShortDate(date, locale);
}

export function greeting(now: Date, l?: L): string {
  const locale = l ?? currentLocale();
  const h = zonedParts(now).hour;
  if (h < 12) return translate(locale, "common.goodMorning");
  if (h < 18) return translate(locale, "common.goodAfternoon");
  return translate(locale, "common.goodEvening");
}
