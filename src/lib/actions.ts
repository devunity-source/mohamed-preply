"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, newId, withData } from "@/lib/data/store";
import { insert, notify, remove, update } from "@/lib/data/save";
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
      await notify(target.id, `${author.fullName.split(" ")[0]} mentioned you in “${where}”`, href);
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
  const s = db();
  const assignment = s.assignments.find((a) => a.id === form.get("assignmentId"));
  if (!assignment || !isCohortMember(user.id, assignment.cohortId)) return { error: "Assignment not found." };

  const repoUrl = String(form.get("repoUrl") ?? "").trim();
  const note = String(form.get("note") ?? "")
    .trim()
    .slice(0, 2000);
  let parsed: URL;
  try {
    parsed = new URL(repoUrl);
  } catch {
    return { error: "Enter a full repository URL, like https://github.com/you/repo." };
  }
  if (parsed.protocol !== "https:" || !["github.com", "gitlab.com", "dev.azure.com"].includes(parsed.hostname)) {
    return { error: "Use a GitHub, GitLab or Azure DevOps repository URL." };
  }

  const existing = s.submissions.find((x) => x.assignmentId === assignment.id && x.userId === user.id);
  if (existing?.grade != null) return { error: "This submission has already been graded." };
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
    await notify(m.userId, `${user.fullName} submitted “${assignment.title}”`, href);
  }
  revalidatePath("/", "layout");
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Community

export const createPost = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const user = await currentUser();
  const space = spaceBySlug(String(form.get("space") ?? ""), user.id);
  if (!space) return { error: "Space not found." };
  if (!canPost(user, space)) return { error: "Only instructors can post here." };

  const title = String(form.get("title") ?? "")
    .trim()
    .slice(0, 140);
  const body = String(form.get("body") ?? "")
    .trim()
    .slice(0, 10_000);
  if (!title || !body) return { error: "Add a title and some text." };

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
  const s = db();
  const post = s.posts.find((p) => p.id === form.get("postId"));
  if (!post || !visibleSpaces(user.id).some((sp) => sp.id === post.spaceId)) return { error: "Post not found." };
  if (post.locked) return { error: "This thread is locked." };

  const body = String(form.get("body") ?? "")
    .trim()
    .slice(0, 5000);
  if (!body) return { error: "Write something first." };

  await insert("comments", { id: newId("co"), postId: post.id, authorId: user.id, body, createdAt: new Date() });
  const space = s.spaces.find((sp) => sp.id === post.spaceId)!;
  const href = `/community/${space.slug}/${post.id}`;
  if (post.authorId !== user.id) {
    await notify(post.authorId, `${user.fullName.split(" ")[0]} commented on “${post.title}”`, href);
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

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (!rateLimit(`waitlist:${ip}`, 5, 60_000)) return { error: "Too many attempts. Try again in a minute." };

  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return { error: "Enter a valid email address." };

  const s = db();
  const programme = s.programmes.find((p) => p.published && p.slug === form.get("programme"));
  if (!programme) return { error: "Pick a programme." };

  // Same answer whether or not the email was already listed, so the form
  // can't be used to find out who signed up.
  // With Supabase, visitors can't read the list: a repeat sign-up just hits
  // the unique (email, programme) rule, which is ignored.
  const exists = s.waitlist.some((w) => w.email === email && w.programmeId === programme.id);
  if (!exists && s.waitlist.length < MAX_WAITLIST) {
    try {
      await insert("waitlist", { id: newId("wl"), email, programmeId: programme.id, createdAt: new Date() });
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
  const s = db();
  const cohortId = String(form.get("cohortId") ?? "");
  const isStudent = s.cohortMembers.some(
    (m) => m.cohortId === cohortId && m.userId === user.id && m.role === "student",
  );
  if (!isStudent) return { error: "Only students in this cohort can message its instructors." };

  const now = new Date();
  const status = officeStatus(cohortId, now);
  if (!status.open) {
    return {
      error: status.next
        ? `Office hours are closed. They open ${formatWeekday(status.next.at)} at ${formatTime(status.next.at)}.`
        : "Office hours are closed.",
    };
  }
  const body = String(form.get("body") ?? "")
    .trim()
    .slice(0, 2000);
  if (!body) return { error: "Write your message first." };
  if (!rateLimit(`office:${user.id}`, 20, 60 * 60_000)) {
    return { error: "That's a lot of messages. Wait a bit, or bring it to the next class." };
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
      `Office hours: ${user.fullName.split(" ")[0]} sent you a message`,
      `/admin/cohorts/${cohortId}/office-hours?student=${user.id}`,
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
