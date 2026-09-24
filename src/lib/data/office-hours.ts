import "server-only";
import { db } from "./store";
import { profileById } from "./repo";
import { activeLocale, addDays, zonedParts } from "@/lib/time";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import type { OfficeHoursSlot, OfficeMessage, OfficeThread, Profile } from "@/lib/types";

/** English day names, Monday first. For display use weekdayName(), which follows the reader's language. */
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** The name of weekday `i` (0 = Monday ... 6 = Sunday) in the request's language, or `locale`. */
export function weekdayName(i: number, locale: Locale = activeLocale()): string {
  // 1 January 2024 was a Monday.
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2024, 0, 1 + i)),
  );
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function officeHoursFor(cohortId: string): OfficeHoursSlot[] {
  return db()
    .officeHours.filter((s) => s.cohortId === cohortId)
    .sort((a, b) => a.weekday - b.weekday);
}

export interface OfficeStatus {
  hasSchedule: boolean;
  open: boolean;
  /** When open: today's closing time, "HH:MM". */
  closesAt?: string;
  /** When closed: the next time it opens. */
  next?: { at: Date; weekday: number; start: string };
}

/**
 * Open or closed right now, in the academy timezone. This is the single source
 * of truth: the page greys out the form with it and the server action refuses
 * messages with it, so the rule can't be bypassed by re-enabling the form.
 */
export function officeStatus(cohortId: string, now: Date): OfficeStatus {
  const slots = officeHoursFor(cohortId);
  if (slots.length === 0) return { hasSchedule: false, open: false };
  const p = zonedParts(now);
  const mins = p.hour * 60 + p.minute;
  const today = slots.find((s) => s.weekday === p.weekday);
  if (today && toMinutes(today.start) <= mins && mins < toMinutes(today.end)) {
    return { hasSchedule: true, open: true, closesAt: today.end };
  }
  for (let d = 0; d <= 7; d++) {
    const weekday = (p.weekday + d) % 7;
    const slot = slots.find((s) => s.weekday === weekday);
    if (!slot || (d === 0 && toMinutes(slot.start) <= mins)) continue;
    return { hasSchedule: true, open: false, next: { at: addDays(now, d, slot.start), weekday, start: slot.start } };
  }
  return { hasSchedule: true, open: false };
}

export function threadFor(cohortId: string, studentId: string): OfficeThread | undefined {
  return db().officeThreads.find((t) => t.cohortId === cohortId && t.studentId === studentId);
}

export function threadById(id: string): OfficeThread | undefined {
  return db().officeThreads.find((t) => t.id === id);
}

export interface MessageView extends OfficeMessage {
  author: Profile;
}

export function messagesIn(threadId: string): MessageView[] {
  return db()
    .officeMessages.filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((m) => ({ ...m, author: profileById(m.authorId)! }));
}

export interface InboxRow {
  thread: OfficeThread;
  student: Profile;
  last: MessageView;
  unread: boolean;
}

/** Instructor inbox: one row per student who has written, newest first. */
export function inboxFor(cohortId: string): InboxRow[] {
  return db()
    .officeThreads.filter((t) => t.cohortId === cohortId)
    .map((thread) => {
      const msgs = messagesIn(thread.id);
      const last = msgs[msgs.length - 1];
      const unread = msgs.some(
        (m) => m.authorId === thread.studentId && (!thread.instructorReadAt || m.createdAt > thread.instructorReadAt),
      );
      return { thread, student: profileById(thread.studentId)!, last, unread };
    })
    .filter((r) => r.last)
    .sort((a, b) => b.thread.lastMessageAt.getTime() - a.thread.lastMessageAt.getTime());
}

export const unreadInboxCount = (cohortId: string) => inboxFor(cohortId).filter((r) => r.unread).length;

/** Replies the student hasn't opened yet. */
export function unreadRepliesFor(cohortId: string, studentId: string): number {
  const t = threadFor(cohortId, studentId);
  if (!t) return 0;
  return messagesIn(t.id).filter((m) => m.authorId !== studentId && (!t.studentReadAt || m.createdAt > t.studentReadAt))
    .length;
}
