import "server-only";
import { db } from "./store";
import { addDays, daysBetween, startOfWeek } from "@/lib/time";
import type {
  Assignment,
  CalendarKind,
  ClassSession,
  Cohort,
  Lab,
  LabStatus,
  Module,
  Post,
  Profile,
  Programme,
  Space,
  Submission,
} from "@/lib/types";

// Read-side queries. Every page goes through this module; Phase 2 replaces
// the bodies with Supabase queries and keeps the signatures.

export function profileById(id: string): Profile | undefined {
  return db().profiles.find((p) => p.id === id);
}

export function profileByHandle(handle: string): Profile | undefined {
  return db().profiles.find((p) => p.handle === handle);
}

export function programmeById(id: string): Programme | undefined {
  return db().programmes.find((p) => p.id === id);
}

export function listProfiles(): Profile[] {
  return db().profiles;
}

export function listProgrammes(): Programme[] {
  return db().programmes;
}

/** What prospective students can see: landing page, catalogue, waitlist. */
export function publishedProgrammes(): Programme[] {
  return db().programmes.filter((p) => p.published);
}

/** The cohort a prospective student would join: the next upcoming one, else the one running now. */
export function nextCohortFor(programmeId: string): Cohort | undefined {
  const cohorts = db()
    .cohorts.filter((c) => c.programmeId === programmeId && c.status !== "completed")
    .sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime());
  return cohorts.find((c) => c.status === "upcoming") ?? cohorts.find((c) => c.status === "active");
}

// ---------------------------------------------------------------------------
// Cohorts

export function isCohortMember(userId: string, cohortId: string): boolean {
  return db().cohortMembers.some((m) => m.userId === userId && m.cohortId === cohortId);
}

export interface CohortSummary {
  cohort: Cohort;
  programme: Programme;
  role: "student" | "instructor";
}

export function myCohorts(userId: string): CohortSummary[] {
  const s = db();
  return s.cohortMembers
    .filter((m) => m.userId === userId)
    .map((m) => {
      const cohort = s.cohorts.find((c) => c.id === m.cohortId)!;
      return { cohort, programme: programmeById(cohort.programmeId)!, role: m.role };
    })
    .sort((a, b) => a.cohort.startsOn.getTime() - b.cohort.startsOn.getTime());
}

/** The cohort the dashboard should focus on: the active one, else the next. */
export function primaryCohort(userId: string): CohortSummary | undefined {
  const list = myCohorts(userId);
  return list.find((c) => c.cohort.status === "active") ?? list.find((c) => c.cohort.status === "upcoming");
}

export function cohortForUser(cohortId: string, userId: string): CohortSummary | undefined {
  return myCohorts(userId).find((c) => c.cohort.id === cohortId);
}

export function cohortRoster(cohortId: string) {
  const s = db();
  const members = s.cohortMembers.filter((m) => m.cohortId === cohortId);
  const pick = (role: string) => members.filter((m) => m.role === role).map((m) => profileById(m.userId)!);
  return { instructors: pick("instructor"), students: pick("student") };
}

export function cohortWeek(cohort: Cohort, now: Date) {
  const totalWeeks = Math.ceil((daysBetween(cohort.startsOn, cohort.endsOn) + 1) / 7);
  const raw = Math.floor(daysBetween(cohort.startsOn, now) / 7) + 1;
  return { week: Math.min(Math.max(raw, 0), totalWeeks), totalWeeks };
}

// ---------------------------------------------------------------------------
// Curriculum and progress

export function modulesFor(programmeId: string) {
  const s = db();
  return s.modules
    .filter((m) => m.programmeId === programmeId)
    .sort((a, b) => a.week - b.week || a.position - b.position)
    .map((m) => ({
      module: m,
      lessons: s.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position),
    }));
}

export function moduleById(id: string): Module | undefined {
  return db().modules.find((m) => m.id === id);
}

export function lessonById(id: string) {
  return db().lessons.find((l) => l.id === id);
}

export function completedLessonIds(userId: string): Set<string> {
  return new Set(
    db()
      .lessonProgress.filter((p) => p.userId === userId)
      .map((p) => p.lessonId),
  );
}

/** Where a lesson sits in its programme: module, position, and its neighbours. */
export function lessonContext(programmeId: string, lessonId: string) {
  const modules = modulesFor(programmeId);
  const flat = modules.flatMap(({ module, lessons }) =>
    lessons.map((lesson) => ({ module, lesson, siblings: lessons })),
  );
  const i = flat.findIndex((x) => x.lesson.id === lessonId);
  if (i < 0) return undefined;
  const here = flat[i];
  return {
    module: here.module,
    lesson: here.lesson,
    siblings: here.siblings,
    indexInModule: here.siblings.indexOf(here.lesson),
    prev: flat[i - 1]?.lesson,
    next: flat[i + 1]?.lesson,
  };
}

/**
 * The lesson to resume: the first unfinished one in this week's module, else
 * the first unfinished one anywhere in the programme.
 */
export function nextLessonFor(userId: string, cohort: Cohort, now: Date) {
  const done = completedLessonIds(userId);
  const { week } = cohortWeek(cohort, now);
  const modules = modulesFor(cohort.programmeId);
  const pick = (list: typeof modules) =>
    list
      .flatMap((m) => m.lessons.map((lesson) => ({ module: m.module, lesson, total: m.lessons.length })))
      .find((x) => !done.has(x.lesson.id));
  return pick(modules.filter((m) => m.module.week === week)) ?? pick(modules);
}

export type ModuleStatus = "done" | "in_progress" | "not_started";

export function labStatus(userId: string, labId: string): LabStatus {
  return db().labAttempts.find((a) => a.userId === userId && a.labId === labId)?.status ?? "not_started";
}

export function submissionFor(userId: string, assignmentId: string): Submission | undefined {
  return db().submissions.find((s) => s.userId === userId && s.assignmentId === assignmentId);
}

export function cohortLabs(cohortId: string): Lab[] {
  return db()
    .labs.filter((l) => l.cohortId === cohortId)
    .sort((a, b) => a.number - b.number);
}

export function cohortAssignments(cohortId: string): Assignment[] {
  return db()
    .assignments.filter((a) => a.cohortId === cohortId)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

/**
 * Programme progress for one student in one cohort. Lessons, labs and
 * assignments each count as one unit of work.
 */
export function progressFor(userId: string, cohort: Cohort) {
  const done = completedLessonIds(userId);
  const modules = modulesFor(cohort.programmeId).map(({ module, lessons }) => {
    const lessonsDone = lessons.filter((l) => done.has(l.id)).length;
    const status: ModuleStatus =
      lessonsDone === lessons.length && lessons.length > 0 ? "done" : lessonsDone > 0 ? "in_progress" : "not_started";
    return { module, lessons, lessonsDone, status };
  });

  const labs = cohortLabs(cohort.id);
  const labsDone = labs.filter((l) => ["submitted", "passed"].includes(labStatus(userId, l.id))).length;
  const assignments = cohortAssignments(cohort.id);
  const assignmentsDone = assignments.filter((a) => submissionFor(userId, a.id)).length;

  const lessonsTotal = modules.reduce((n, m) => n + m.lessons.length, 0);
  const lessonsDone = modules.reduce((n, m) => n + m.lessonsDone, 0);
  const total = lessonsTotal + labs.length + assignments.length;
  const completed = lessonsDone + labsDone + assignmentsDone;

  return {
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    modules,
    lessons: { done: lessonsDone, total: lessonsTotal },
    labs: { done: labsDone, total: labs.length },
    assignments: { done: assignmentsDone, total: assignments.length },
  };
}

// ---------------------------------------------------------------------------
// Classes and schedule

export function cohortClasses(cohortId: string): ClassSession[] {
  return db()
    .classes.filter((c) => c.cohortId === cohortId)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function classById(id: string): ClassSession | undefined {
  return db().classes.find((c) => c.id === id);
}

/** Next class that hasn't ended yet. */
export function nextClass(cohortId: string, now: Date): ClassSession | undefined {
  return cohortClasses(cohortId).find((c) => c.startsAt.getTime() + c.durationMin * 60_000 > now.getTime());
}

export function isLive(c: ClassSession, now: Date): boolean {
  const start = c.startsAt.getTime();
  // The room opens 10 minutes early.
  return now.getTime() >= start - 10 * 60_000 && now.getTime() <= start + c.durationMin * 60_000;
}

export function resourcesByIds(ids: string[]) {
  return db().resources.filter((r) => ids.includes(r.id));
}

export function resourcesForModule(moduleId: string, cohortId: string) {
  return db().resources.filter((r) => r.moduleId === moduleId && (!r.cohortId || r.cohortId === cohortId));
}

export function classResources(c: ClassSession) {
  return db().resources.filter(
    (r) => r.id === `r_slides_${c.id}` || r.id === `r_rec_${c.id}` || (r.kind === "lab" && r.moduleId === c.moduleId),
  );
}

export function attendanceCount(classId: string): number {
  return db().attendance.filter((a) => a.classId === classId && a.status !== "absent").length;
}

export interface CalendarItem {
  id: string;
  kind: CalendarKind;
  title: string;
  startsAt: Date;
  durationMin: number;
  href: string | null;
  cohortId: string | null;
}

/** Everything on a user's calendar between two instants. */
export function calendarFor(userId: string, from: Date, to: Date): CalendarItem[] {
  const s = db();
  const cohortIds = new Set(myCohorts(userId).map((c) => c.cohort.id));
  const inRange = (d: Date) => d >= from && d < to;
  const items: CalendarItem[] = [];

  for (const c of s.classes) {
    if (!cohortIds.has(c.cohortId) || !inRange(c.startsAt)) continue;
    items.push({
      id: c.id,
      kind: "class",
      title: c.title,
      startsAt: c.startsAt,
      durationMin: c.durationMin,
      href: `/cohorts/${c.cohortId}/classes/${c.id}`,
      cohortId: c.cohortId,
    });
  }
  for (const e of s.events) {
    if ((e.cohortId && !cohortIds.has(e.cohortId)) || !inRange(e.startsAt)) continue;
    items.push({
      id: e.id,
      kind: e.kind,
      title: e.title,
      startsAt: e.startsAt,
      durationMin: e.durationMin,
      href: e.kind === "lab" && e.cohortId ? `/cohorts/${e.cohortId}/labs` : null,
      cohortId: e.cohortId,
    });
  }
  for (const a of s.assignments) {
    if (!cohortIds.has(a.cohortId) || !inRange(a.dueAt)) continue;
    items.push({
      id: `due_${a.id}`,
      kind: "deadline",
      title: `Due: ${a.title}`,
      startsAt: a.dueAt,
      durationMin: 0,
      href: `/cohorts/${a.cohortId}/assignments/${a.id}`,
      cohortId: a.cohortId,
    });
  }
  for (const l of s.labs) {
    if (!cohortIds.has(l.cohortId) || !inRange(l.dueAt)) continue;
    items.push({
      id: `due_${l.id}`,
      kind: "deadline",
      title: `Due: Lab #${String(l.number).padStart(2, "0")}`,
      startsAt: l.dueAt,
      durationMin: 0,
      href: `/cohorts/${l.cohortId}/labs`,
      cohortId: l.cohortId,
    });
  }
  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function thisWeek(userId: string, now: Date) {
  const from = startOfWeek(now);
  return calendarFor(userId, from, addDays(from, 7, "00:00"));
}

// ---------------------------------------------------------------------------
// Tasks

export interface Task {
  id: string;
  kind: "lab" | "assignment";
  title: string;
  dueAt: Date;
  done: boolean;
  href: string;
}

/** Open labs and assignments due from last week onwards, plus recent completions. */
export function tasksFor(userId: string, cohortId: string, now: Date): Task[] {
  const horizon = addDays(now, 14);
  const since = addDays(now, -7);
  const tasks: Task[] = [];
  for (const l of cohortLabs(cohortId)) {
    if (l.dueAt > horizon || l.dueAt < since) continue;
    const st = labStatus(userId, l.id);
    tasks.push({
      id: l.id,
      kind: "lab",
      title: `Lab #${String(l.number).padStart(2, "0")}: ${l.title}`,
      dueAt: l.dueAt,
      done: st === "submitted" || st === "passed",
      href: `/cohorts/${cohortId}/labs`,
    });
  }
  for (const a of cohortAssignments(cohortId)) {
    if (a.dueAt > horizon || a.dueAt < since) continue;
    tasks.push({
      id: a.id,
      kind: "assignment",
      title: a.title,
      dueAt: a.dueAt,
      done: !!submissionFor(userId, a.id),
      href: `/cohorts/${cohortId}/assignments/${a.id}`,
    });
  }
  return tasks.sort((a, b) => Number(a.done) - Number(b.done) || a.dueAt.getTime() - b.dueAt.getTime());
}

// ---------------------------------------------------------------------------
// Community

export function visibleSpaces(userId: string): Space[] {
  return db().spaces.filter((s) => !s.cohortId || isCohortMember(userId, s.cohortId));
}

export function spaceBySlug(slug: string, userId: string): Space | undefined {
  return visibleSpaces(userId).find((s) => s.slug === slug);
}

export function cohortSpaces(cohortId: string): Space[] {
  return db().spaces.filter((s) => s.cohortId === cohortId);
}

export function teaches(userId: string, cohortId: string): boolean {
  return db().cohortMembers.some((m) => m.userId === userId && m.cohortId === cohortId && m.role === "instructor");
}

/** Read-only spaces: admins anywhere, instructors only in cohorts they teach. Mirrors can_moderate_space() in SQL. */
export function canPost(user: Profile, space: Space): boolean {
  if (!space.readOnly || user.role === "admin") return true;
  return !!space.cohortId && teaches(user.id, space.cohortId);
}

export interface PostView {
  post: Post;
  author: Profile;
  space: Space;
  commentCount: number;
  reactions: { emoji: string; count: number; mine: boolean }[];
}

function postView(post: Post, userId: string): PostView {
  const s = db();
  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const r of s.reactions.filter((r) => r.postId === post.id)) {
    const cur = counts.get(r.emoji) ?? { count: 0, mine: false };
    counts.set(r.emoji, { count: cur.count + 1, mine: cur.mine || r.userId === userId });
  }
  return {
    post,
    author: profileById(post.authorId)!,
    space: s.spaces.find((sp) => sp.id === post.spaceId)!,
    commentCount: s.comments.filter((c) => c.postId === post.id).length,
    reactions: [...counts].map(([emoji, v]) => ({ emoji, ...v })),
  };
}

export function postsInSpace(spaceId: string, userId: string): PostView[] {
  return db()
    .posts.filter((p) => p.spaceId === spaceId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.getTime() - a.createdAt.getTime())
    .map((p) => postView(p, userId));
}

/** Latest posts across every space the user can see. */
export function feedFor(userId: string, limit = 20): PostView[] {
  const ids = new Set(visibleSpaces(userId).map((s) => s.id));
  return db()
    .posts.filter((p) => ids.has(p.spaceId))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map((p) => postView(p, userId));
}

export function postWithComments(postId: string, userId: string) {
  const s = db();
  const post = s.posts.find((p) => p.id === postId);
  if (!post || !visibleSpaces(userId).some((sp) => sp.id === post.spaceId)) return undefined;
  const comments = s.comments
    .filter((c) => c.postId === postId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((c) => ({ comment: c, author: profileById(c.authorId)! }));
  return { ...postView(post, userId), comments };
}

export function cohortPulse(cohortId: string, now: Date) {
  const s = db();
  const spaceIds = new Set(s.spaces.filter((sp) => sp.cohortId === cohortId).map((sp) => sp.id));
  const weekAgo = addDays(now, -7);
  const newDiscussions = s.posts.filter((p) => spaceIds.has(p.spaceId) && p.createdAt >= weekAgo).length;
  const currentLab = cohortLabs(cohortId).find((l) => l.dueAt >= now);
  const labFinishers = currentLab
    ? s.labAttempts.filter((a) => a.labId === currentLab.id && (a.status === "submitted" || a.status === "passed"))
        .length
    : 0;
  return { newDiscussions, currentLab, labFinishers };
}

// ---------------------------------------------------------------------------
// Notifications

export function notificationsFor(userId: string) {
  return db()
    .notifications.filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function unreadCount(userId: string): number {
  return notificationsFor(userId).filter((n) => !n.readAt).length;
}

// ---------------------------------------------------------------------------
// Resources

export function resourcesFor(userId: string) {
  const cohortIds = new Set(myCohorts(userId).map((c) => c.cohort.id));
  return db().resources.filter((r) => !r.cohortId || cohortIds.has(r.cohortId));
}

// ---------------------------------------------------------------------------
// Achievements. Kept deliberately small; the programme itself is the reward.

export interface Achievement {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

export function achievementsFor(userId: string, cohort: Cohort): Achievement[] {
  const labs = cohortLabs(cohort.id);
  const passed = (n: number) => labs.filter((l) => l.number <= n).every((l) => labStatus(userId, l.id) === "passed");
  const anyLab = labs.some((l) => ["submitted", "passed"].includes(labStatus(userId, l.id)));
  const progress = progressFor(userId, cohort);
  const moduleDone = (week: number) => progress.modules.find((m) => m.module.week === week)?.status === "done";
  const posted = db().posts.some((p) => p.authorId === userId) || db().comments.some((c) => c.authorId === userId);
  return [
    { id: "first_lab", label: "First Lab", description: "Submit your first lab.", earned: anyLab },
    { id: "voice", label: "Joined the Conversation", description: "Post or reply in the community.", earned: posted },
    { id: "foundations", label: "Foundations", description: "Finish the Foundations module.", earned: moduleDone(1) },
    { id: "azure", label: "Azure Practitioner", description: "Finish the Azure module.", earned: moduleDone(2) },
    { id: "terraform", label: "Terraform", description: "Pass labs 1 to 3.", earned: passed(3) && labs.length >= 3 },
    { id: "kubernetes", label: "Kubernetes", description: "Finish the Kubernetes module.", earned: moduleDone(4) },
    { id: "capstone", label: "Capstone Completed", description: "Present your capstone.", earned: moduleDone(6) },
  ];
}
