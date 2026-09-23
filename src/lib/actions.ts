"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, newId } from "@/lib/data/store";
import { canPost, isCohortMember, profileByHandle, spaceBySlug, visibleSpaces } from "@/lib/data/repo";
import { currentUser, SESSION_COOKIE } from "@/lib/session";
import type { LabStatus, Profile } from "@/lib/types";

// Server actions are reachable by direct POST, so every one re-checks who the
// caller is and whether they may touch the target.

export interface FormState {
  error?: string;
  ok?: boolean;
}

function notify(userId: string, text: string, href: string) {
  db().notifications.push({ id: newId("n"), userId, text, href, createdAt: new Date(), readAt: null });
}

function notifyMentions(body: string, author: Profile, href: string, where: string) {
  const handles = new Set([...body.matchAll(/@([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase()));
  for (const handle of handles) {
    const target = profileByHandle(handle);
    if (target && target.id !== author.id) {
      notify(target.id, `${author.fullName.split(" ")[0]} mentioned you in “${where}”`, href);
    }
  }
}

function inProgrammeCohort(userId: string, programmeId: string): boolean {
  return db().cohorts.some((c) => c.programmeId === programmeId && isCohortMember(userId, c.id));
}

// ---------------------------------------------------------------------------
// Learning

export async function toggleLesson(lessonId: string) {
  const user = await currentUser();
  const s = db();
  const lesson = s.lessons.find((l) => l.id === lessonId);
  const mod = lesson && s.modules.find((m) => m.id === lesson.moduleId);
  if (!lesson || !mod || !inProgrammeCohort(user.id, mod.programmeId)) throw new Error("Not found");

  const i = s.lessonProgress.findIndex((p) => p.userId === user.id && p.lessonId === lessonId);
  if (i >= 0) s.lessonProgress.splice(i, 1);
  else s.lessonProgress.push({ userId: user.id, lessonId, completedAt: new Date() });
  revalidatePath("/", "layout");
}

export async function updateLab(labId: string, status: Extract<LabStatus, "in_progress" | "submitted">) {
  const user = await currentUser();
  const s = db();
  const lab = s.labs.find((l) => l.id === labId);
  if (!lab || !isCohortMember(user.id, lab.cohortId)) throw new Error("Not found");

  const attempt = s.labAttempts.find((a) => a.labId === labId && a.userId === user.id);
  if (attempt?.status === "passed") return;
  if (attempt) {
    attempt.status = status;
    attempt.updatedAt = new Date();
  } else {
    s.labAttempts.push({ labId, userId: user.id, status, updatedAt: new Date() });
  }
  revalidatePath("/", "layout");
}

export async function submitAssignment(_prev: FormState, form: FormData): Promise<FormState> {
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
    Object.assign(existing, { repoUrl, note, submittedAt: new Date() });
  } else {
    s.submissions.push({
      id: newId("sub"),
      assignmentId: assignment.id,
      userId: user.id,
      repoUrl,
      note,
      submittedAt: new Date(),
      grade: null,
      feedback: null,
    });
  }

  const href = `/cohorts/${assignment.cohortId}/assignments/${assignment.id}`;
  for (const m of s.cohortMembers.filter((m) => m.cohortId === assignment.cohortId && m.role === "instructor")) {
    notify(m.userId, `${user.fullName} submitted “${assignment.title}”`, href);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Community

export async function createPost(_prev: FormState, form: FormData): Promise<FormState> {
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
  db().posts.push({ id, spaceId: space.id, authorId: user.id, title, body, createdAt: new Date(), pinned: false });
  const href = `/community/${space.slug}/${id}`;
  notifyMentions(body, user, href, title);
  revalidatePath("/", "layout");
  redirect(href);
}

export async function addComment(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  const s = db();
  const post = s.posts.find((p) => p.id === form.get("postId"));
  if (!post || !visibleSpaces(user.id).some((sp) => sp.id === post.spaceId)) return { error: "Post not found." };

  const body = String(form.get("body") ?? "")
    .trim()
    .slice(0, 5000);
  if (!body) return { error: "Write something first." };

  s.comments.push({ id: newId("co"), postId: post.id, authorId: user.id, body, createdAt: new Date() });
  const space = s.spaces.find((sp) => sp.id === post.spaceId)!;
  const href = `/community/${space.slug}/${post.id}`;
  if (post.authorId !== user.id) {
    notify(post.authorId, `${user.fullName.split(" ")[0]} commented on “${post.title}”`, href);
  }
  notifyMentions(body, user, href, post.title);
  revalidatePath("/", "layout");
  return { ok: true };
}

const EMOJI = new Set(["👍", "🔥", "🎉", "💡", "❤️"]);

export async function toggleReaction(postId: string, emoji: string) {
  const user = await currentUser();
  const s = db();
  const post = s.posts.find((p) => p.id === postId);
  if (!post || !EMOJI.has(emoji) || !visibleSpaces(user.id).some((sp) => sp.id === post.spaceId)) {
    throw new Error("Not found");
  }
  const i = s.reactions.findIndex((r) => r.postId === postId && r.userId === user.id && r.emoji === emoji);
  if (i >= 0) s.reactions.splice(i, 1);
  else s.reactions.push({ postId, userId: user.id, emoji });
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Notifications and demo session

export async function markAllRead() {
  const user = await currentUser();
  const now = new Date();
  for (const n of db().notifications) if (n.userId === user.id && !n.readAt) n.readAt = now;
  revalidatePath("/", "layout");
}

export async function openNotification(id: string) {
  const user = await currentUser();
  const n = db().notifications.find((x) => x.id === id && x.userId === user.id);
  if (!n) redirect("/notifications");
  n.readAt ??= new Date();
  revalidatePath("/", "layout");
  redirect(n.href);
}

/** Demo only: switch which seeded profile you're signed in as. */
export async function switchDemoUser(form: FormData) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return; // real auth is configured
  const id = String(form.get("userId") ?? "");
  if (!db().profiles.some((p) => p.id === id)) return;
  (await cookies()).set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
