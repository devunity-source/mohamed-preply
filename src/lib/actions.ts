"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, newId, withData } from "@/lib/data/store";
import { insert, notify, remove, update } from "@/lib/data/save";
import { sendLater } from "@/lib/email/send";
import { waitlistEmail } from "@/lib/email/templates";
import { getI18n, getLocale } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import { EMAIL_KINDS, turnOffFromLink } from "@/lib/email/prefs";
import { validUnsubscribe } from "@/lib/email/links";
import {
  canPost,
  cohortRoster,
  isCohortMember,
  lessonContext,
  profileByHandle,
  spaceBySlug,
  visibleSpaces,
} from "@/lib/data/repo";
import { officeStatus, threadById, threadFor } from "@/lib/data/office-hours";
import { formatTime, formatWeekday } from "@/lib/time";
import { isInternalPath } from "@/lib/paths";
import { rateLimit } from "@/lib/rate-limit";
import { currentUser } from "@/lib/session";
import type { LabStatus, Profile } from "@/lib/types";

// Server actions are reachable by direct POST, so every one re-checks who the
// caller is and whether they may touch the target.

export interface FormState {
  error?: string;
  ok?: boolean;
  /** Extra text to show after a successful save. */
  message?: string;
}

const MAX_MENTIONS = 10;

/** Notify mentioned users, but only those who can see the space (no leaking private titles). */
async function notifyMentions(body: string, author: Profile, spaceId: string, href: string, where: string) {
  const handles = [...new Set([...body.matchAll(/@([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase()))];
  for (const handle of handles.slice(0, MAX_MENTIONS)) {
    const target = profileByHandle(handle);
    if (target && target.id !== author.id && visibleSpaces(target.id).some((sp) => sp.id === spaceId)) {
      await notify(target.id, "notify.mentioned", { name: author.fullName.split(" ")[0], where }, href, "community");
    }
  }
}

function inProgrammeCohort(userId: string, programmeId: string): boolean {
  return db().cohorts.some((c) => c.programmeId === programmeId && isCohortMember(userId, c.id));
}

// ---------------------------------------------------------------------------
// Learning

export const toggleLesson = withData(async (lessonId: string) => {
  const user = await currentUser();
  const s = db();
  const lesson = s.lessons.find((l) => l.id === lessonId);
  const mod = lesson && s.modules.find((m) => m.id === lesson.moduleId);
  if (!lesson || !mod || !inProgrammeCohort(user.id, mod.programmeId)) throw new Error("Not found");

  const done = s.lessonProgress.find((p) => p.userId === user.id && p.lessonId === lessonId);
  if (done) await remove("lessonProgress", done);
  else await insert("lessonProgress", { userId: user.id, lessonId, completedAt: new Date() });
  revalidatePath("/", "layout");
});

const STUDENT_LAB_STATUSES: readonly LabStatus[] = ["in_progress", "submitted"];

/**
 * "Mark done and continue": marks the lesson complete (idempotent) and moves
 * to the next lesson. The destination is worked out here, never taken from
 * the client.
 */
export const completeLessonAndContinue = withData(async (cohortId: string, lessonId: string) => {
  const user = await currentUser();
  const s = db();
  const cohort = s.cohorts.find((c) => c.id === cohortId);
  const lesson = s.lessons.find((l) => l.id === lessonId);
  const mod = lesson && s.modules.find((m) => m.id === lesson.moduleId);
  if (!cohort || !lesson || !mod || mod.programmeId !== cohort.programmeId || !isCohortMember(user.id, cohortId)) {
    throw new Error("Not found");
  }
  if (!s.lessonProgress.some((p) => p.userId === user.id && p.lessonId === lessonId)) {
    await insert("lessonProgress", { userId: user.id, lessonId, completedAt: new Date() });
  }
  const next = lessonContext(cohort.programmeId, lessonId)?.next;
  revalidatePath("/", "layout");
  redirect(
    next
      ? `/cohorts/${cohortId}/modules/${next.moduleId}/${next.id}`
      : `/cohorts/${cohortId}/modules/${mod.id}?finished=1`,
  );
});

export const updateLab = withData(async (labId: string, status: Extract<LabStatus, "in_progress" | "submitted">) => {
  // Bound arguments arrive as plain JSON from the client, so the type above is
  // not a guarantee. Only instructors may set "passed".
  if (!STUDENT_LAB_STATUSES.includes(status)) throw new Error("Invalid status");
  const user = await currentUser();
  const s = db();
  const lab = s.labs.find((l) => l.id === labId);
  if (!lab || !isCohortMember(user.id, lab.cohortId)) throw new Error("Not found");

  const attempt = s.labAttempts.find((a) => a.labId === labId && a.userId === user.id);
  if (attempt?.status === "passed") return;
  if (attempt) await update("labAttempts", attempt, { status, updatedAt: new Date() });
  else await insert("labAttempts", { labId, userId: user.id, status, updatedAt: new Date() });
  revalidatePath("/", "layout");
});

export const submitAssignment = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const user = await currentUser();
  const { t } = await getI18n();
  const s = db();
  const assignment = s.assignments.find((a) => a.id === form.get("assignmentId"));
  if (!assignment || !isCohortMember(user.id, assignment.cohortId)) return { error: t("errors.assignmentNotFound") };

  const repoUrl = String(form.get("repoUrl") ?? "").trim();
  const note = String(form.get("note") ?? "")
    .trim()
    .slice(0, 2000);
  let parsed: URL;
  try {
    parsed = new URL(repoUrl);
  } catch {
    return { error: t("errors.repoUrlFull") };
  }
  if (parsed.protocol !== "https:" || !["github.com", "gitlab.com", "dev.azure.com"].includes(parsed.hostname)) {
    return { error: t("errors.repoUrlHost") };
  }

  const existing = s.submissions.find((x) => x.assignmentId === assignment.id && x.userId === user.id);
  if (existing?.grade != null) return { error: t("errors.alreadyGraded") };
  if (existing) {
    await update("submissions", existing, { repoUrl, note, submittedAt: new Date() });
  } else {
    await insert("submissions", {
      id: newId("sub"),
      assignmentId: assignment.id,
      userId: user.id,
      repoUrl,
      note,
      submittedAt: new Date(),
      grade: null,
      feedback: null,
      rubricScores: null,
      gradedBy: null,
      gradedAt: null,
    });
  }

  const href = `/cohorts/${assignment.cohortId}/assignments/${assignment.id}`;
  for (const m of s.cohortMembers.filter((m) => m.cohortId === assignment.cohortId && m.role === "instructor")) {
    await notify(m.userId, "notify.submitted", { name: user.fullName, title: assignment.title }, href);
  }
  revalidatePath("/", "layout");
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Community

export const createPost = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const user = await currentUser();
  const { t } = await getI18n();
  const space = spaceBySlug(String(form.get("space") ?? ""), user.id);
  if (!space) return { error: t("errors.spaceNotFound") };
  if (!canPost(user, space)) return { error: t("errors.instructorsOnlyPost") };

  const title = String(form.get("title") ?? "")
    .trim()
    .slice(0, 140);
  const body = String(form.get("body") ?? "")
    .trim()
    .slice(0, 10_000);
  if (!title || !body) return { error: t("errors.addTitleAndText") };

  const id = newId("po");
  await insert("posts", {
    id,
    spaceId: space.id,
    authorId: user.id,
    title,
    body,
    createdAt: new Date(),
    pinned: false,
    locked: false,
  });
  const href = `/community/${space.slug}/${id}`;
  await notifyMentions(body, user, space.id, href, title);
  revalidatePath("/", "layout");
  redirect(href);
});

export const addComment = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const user = await currentUser();
  const { t } = await getI18n();
  const s = db();
  const post = s.posts.find((p) => p.id === form.get("postId"));
  if (!post || !visibleSpaces(user.id).some((sp) => sp.id === post.spaceId)) return { error: t("errors.postNotFound") };
  if (post.locked) return { error: t("errors.threadLocked") };

  const body = String(form.get("body") ?? "")
    .trim()
    .slice(0, 5000);
  if (!body) return { error: t("errors.writeSomething") };

  await insert("comments", { id: newId("co"), postId: post.id, authorId: user.id, body, createdAt: new Date() });
  const space = s.spaces.find((sp) => sp.id === post.spaceId)!;
  const href = `/community/${space.slug}/${post.id}`;
  if (post.authorId !== user.id) {
    await notify(
      post.authorId,
      "notify.commented",
      { name: user.fullName.split(" ")[0], title: post.title },
      href,
      "community",
    );
  }
  await notifyMentions(body, user, space.id, href, post.title);
  revalidatePath("/", "layout");
  return { ok: true };
});

const EMOJI = new Set(["👍", "🔥", "🎉", "💡", "❤️"]);

export const toggleReaction = withData(async (postId: string, emoji: string) => {
  const user = await currentUser();
  const s = db();
  const post = s.posts.find((p) => p.id === postId);
  if (!post || !EMOJI.has(emoji) || !visibleSpaces(user.id).some((sp) => sp.id === post.spaceId)) {
    throw new Error("Not found");
  }
  const mine = s.reactions.find((r) => r.postId === postId && r.userId === user.id && r.emoji === emoji);
  if (mine) await remove("reactions", mine);
  else await insert("reactions", { postId, userId: user.id, emoji });
  revalidatePath("/", "layout");
});

// ---------------------------------------------------------------------------
// Public: waitlist (no sign-in)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_WAITLIST = 50_000; // bounds the in-memory demo store

export const joinWaitlist = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  // Honeypot: real people never see or fill this field. Pretend success for bots.
  if (String(form.get("company") ?? "") !== "") return { ok: true };

  const { t } = await getI18n();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (!rateLimit(`waitlist:${ip}`, 5, 60_000)) return { error: t("errors.tooManyAttemptsMinute") };

  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return { error: t("errors.invalidEmail") };

  const s = db();
  const programme = s.programmes.find((p) => p.published && p.slug === form.get("programme"));
  if (!programme) return { error: t("errors.pickProgramme") };

  // Same answer whether or not the email was already listed, so the form
  // can't be used to find out who signed up.
  // With Supabase, visitors can't read the list: a repeat sign-up just hits
  // the unique (email, programme) rule, which is ignored.
  const exists = s.waitlist.some((w) => w.email === email && w.programmeId === programme.id);
  if (!exists && s.waitlist.length < MAX_WAITLIST) {
    try {
      await insert("waitlist", { id: newId("wl"), email, programmeId: programme.id, createdAt: new Date() });
      // Only a new sign-up gets the confirmation, so resubmitting can't be used to spam someone.
      // In the language they were browsing in.
      const locale = await getLocale();
      sendLater(async () => ({ to: email, tag: "waitlist", ...waitlistEmail(loc(programme, locale).title, locale) }));
    } catch (e) {
      if (!/duplicate key|unique/i.test((e as Error).message)) throw e;
    }
  }
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Notifications and demo session

/**
 * Records a visit to a space. No revalidation on purpose: the page keeps its
 * "New" markers from before the visit, and the sidebar hides the badge for
 * the space you're in.
 */
export const markSpaceSeen = withData(async (slug: string) => {
  const user = await currentUser();
  if (typeof slug !== "string") return;
  const space = spaceBySlug(slug, user.id);
  if (!space) return;
  const s = db();
  const existing = s.spaceReads.find((r) => r.userId === user.id && r.spaceId === space.id);
  if (existing) await update("spaceReads", existing, { lastSeenAt: new Date() });
  else await insert("spaceReads", { userId: user.id, spaceId: space.id, lastSeenAt: new Date() });
});

// ---------------------------------------------------------------------------
// Office hours

/**
 * A student writes to their cohort's instructors. Only while office hours are
 * open: the page greys the form out, and this check makes that binding.
 */
export const sendOfficeMessage = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const user = await currentUser();
  const { t } = await getI18n();
  const s = db();
  const cohortId = String(form.get("cohortId") ?? "");
  const isStudent = s.cohortMembers.some(
    (m) => m.cohortId === cohortId && m.userId === user.id && m.role === "student",
  );
  if (!isStudent) return { error: t("errors.officeStudentsOnly") };

  const now = new Date();
  const status = officeStatus(cohortId, now);
  if (!status.open) {
    return {
      error: status.next
        ? t("errors.officeClosedNext", { day: formatWeekday(status.next.at), time: formatTime(status.next.at) })
        : t("errors.officeClosed"),
    };
  }
  const body = String(form.get("body") ?? "")
    .trim()
    .slice(0, 2000);
  if (!body) return { error: t("errors.writeMessage") };
  if (!rateLimit(`office:${user.id}`, 20, 60 * 60_000)) {
    return { error: t("errors.officeTooMany") };
  }

  let thread = threadFor(cohortId, user.id);
  if (!thread) {
    thread = {
      id: newId("ot"),
      cohortId,
      studentId: user.id,
      createdAt: now,
      lastMessageAt: now,
      instructorReadAt: null,
      studentReadAt: now,
    };
    await insert("officeThreads", thread);
  }
  await insert("officeMessages", { id: newId("om"), threadId: thread.id, authorId: user.id, body, createdAt: now });
  await update("officeThreads", thread, { studentReadAt: now });
  // The database moves last_message_at itself (0009); keep this request's copy in step.
  thread.lastMessageAt = now;
  for (const instructor of cohortRoster(cohortId).instructors) {
    await notify(
      instructor.id,
      "notify.officeMessage",
      { name: user.fullName.split(" ")[0] },
      `/admin/cohorts/${cohortId}/office-hours?student=${user.id}`,
      "office_hours",
    );
  }
  revalidatePath("/", "layout");
  return { ok: true };
});

/** Marks a conversation read for whoever is looking at it: its student, or the cohort's staff. */
export const markOfficeThreadRead = withData(async (threadId: string) => {
  const user = await currentUser();
  if (typeof threadId !== "string") return;
  const thread = threadById(threadId);
  if (!thread) return;
  if (thread.studentId === user.id) await update("officeThreads", thread, { studentReadAt: new Date() });
  else if (canManage(user, thread.cohortId)) await update("officeThreads", thread, { instructorReadAt: new Date() });
  else return;
  // Unread counts live in layouts (the admin tab label, the Home card), so refresh them.
  revalidatePath("/", "layout");
});

function canManage(user: Profile, cohortId: string) {
  return (
    user.role === "admin" ||
    db().cohortMembers.some((m) => m.cohortId === cohortId && m.userId === user.id && m.role === "instructor")
  );
}

export const dismissWelcome = withData(async () => {
  const user = await currentUser();
  const profile = db().profiles.find((p) => p.id === user.id);
  if (profile && !profile.onboardedAt) await update("profiles", profile, { onboardedAt: new Date() });
  revalidatePath("/dashboard");
});

export const markAllRead = withData(async () => {
  const user = await currentUser();
  const now = new Date();
  const unread = db().notifications.filter((n) => n.userId === user.id && !n.readAt);
  await Promise.all(unread.map((n) => update("notifications", n, { readAt: now })));
  revalidatePath("/", "layout");
});

export const openNotification = withData(async (id: string) => {
  const user = await currentUser();
  const n = db().notifications.find((x) => x.id === id && x.userId === user.id);
  if (!n) redirect("/notifications");
  if (!n.readAt) await update("notifications", n, { readAt: new Date() });
  revalidatePath("/", "layout");
  redirect(isInternalPath(n.href) ? n.href : "/notifications");
});

// ---------------------------------------------------------------------------
// Email settings

export const saveEmailPrefs = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const user = await currentUser();
  const off = EMAIL_KINDS.map((k) => k.kind).filter((kind) => form.get(`on:${kind}`) !== "on");
  const row = db().emailPrefs.find((p) => p.userId === user.id);
  if (row) await update("emailPrefs", row, { off });
  else await insert("emailPrefs", { userId: user.id, off });
  revalidatePath("/profile");
  return { ok: true };
});

/** From the unsubscribe page's button (the link alone changes nothing, so mail scanners can't). */
export async function unsubscribeFromLink(form: FormData) {
  const [u, k, t] = ["u", "k", "t"].map((f) => String(form.get(f) ?? "").slice(0, 200));
  if (!validUnsubscribe(u, k, t)) redirect("/email/unsubscribe?invalid=1");
  await turnOffFromLink(u, k);
  redirect(`/email/unsubscribe?done=${k}`);
}
