"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, newId, withData } from "@/lib/data/store";
import { insert, notify, remove, removeWhere, update } from "@/lib/data/save";
import { cohortRoster, programmeById, progressFor } from "@/lib/data/repo";
import { cohortById, nextCertificateId, unassignedStudents } from "@/lib/data/admin";
import { canManageCohort, canModerate, isAdmin } from "@/lib/authz";
import { canCreateMeetings, createMeeting } from "@/lib/integrations/video";
import { currentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/translate";
import { weekdayName } from "@/lib/data/office-hours";
import { hashPassword } from "@/lib/auth/password";
import { fromRow, TABLES } from "@/lib/data/schema";
import { siteUrl } from "@/lib/auth/config";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/server";
import { randomBytes } from "node:crypto";
import { addDays, formatMonthYear, wallTime, zonedParts } from "@/lib/time";
import type { FormState } from "@/lib/actions";
import type { Attendance, Cohort, LessonKind, MeetingProvider, Profile, Space, Translations } from "@/lib/types";

// Admin-area writes. Every action is reachable by direct POST, so each one
// re-checks the caller and validates every input at runtime; TypeScript
// types on arguments are not a guarantee (see security review #2).

// ---------------------------------------------------------------------------
// Helpers

class Denied extends Error {}

async function managerOf(cohortId: string): Promise<Profile> {
  const user = await currentUser();
  if (!cohortById(cohortId) || !canManageCohort(user, cohortId)) throw new Denied("Not allowed");
  return user;
}

async function admin(): Promise<Profile> {
  const user = await currentUser();
  if (!isAdmin(user)) throw new Denied("Not allowed");
  return user;
}

const str = (form: FormData, key: string, max = 500) =>
  String(form.get(key) ?? "")
    .trim()
    .slice(0, max);

function int(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

function httpsUrl(value: string, hosts?: string[]): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && (!hosts || hosts.includes(u.hostname));
  } catch {
    return false;
  }
}

/** "2026-10-01" + "19:00" in the academy timezone. */
function parseWallTime(date: string, time: string): Date | null {
  const d = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = time.match(/^(\d{2}):(\d{2})$/);
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [...d.slice(1), ...t.slice(1)].map(Number);
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59) return null;
  return wallTime(y, mo, da, h, mi);
}

const REPO_HOSTS = ["github.com", "gitlab.com", "dev.azure.com"];

function done(path = "/", kind: "layout" | "page" = "layout") {
  revalidatePath(path, kind);
}

// ---------------------------------------------------------------------------
// Grading

export const gradeSubmission = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  const s = db();
  const sub = s.submissions.find((x) => x.id === form.get("submissionId"));
  const assignment = sub && s.assignments.find((a) => a.id === sub.assignmentId);
  if (!sub || !assignment) return { error: t("errors.submissionNotFound") };
  const user = await managerOf(assignment.cohortId);

  const scores: Record<string, number> = {};
  for (const c of assignment.rubric) {
    const v = int(form.get(`score:${c.id}`), 0, c.points);
    if (v === null) return { error: t("errors.rubricScore", { label: c.label, points: c.points }) };
    scores[c.id] = v;
  }
  const total = assignment.rubric.reduce((n, c) => n + c.points, 0);
  const earned = Object.values(scores).reduce((n, v) => n + v, 0);
  const feedback = str(form, "feedback", 5000);
  if (!feedback) return { error: t("errors.writeFeedback") };

  const first = sub.grade == null;
  await update("submissions", sub, {
    rubricScores: scores,
    grade: total === 0 ? 0 : Math.round((earned / total) * 100),
    feedback,
    gradedBy: user.id,
    gradedAt: new Date(),
  });
  await notify(
    sub.userId,
    first ? "notify.graded" : "notify.regraded",
    { title: assignment.title, grade: sub.grade! },
    `/cohorts/${assignment.cohortId}/assignments/${assignment.id}`,
    "grades",
  );
  done();

  // "Save and next ungraded". Only a student in this cohort, so the target can't be steered elsewhere.
  const next = form.get("next");
  if (typeof next === "string" && cohortRoster(assignment.cohortId).students.some((p) => p.id === next)) {
    const q = new URLSearchParams({ student: next, graded: sub.userId });
    redirect(`/admin/cohorts/${assignment.cohortId}/grading/${assignment.id}?${q}`);
  }
  return { ok: true };
});

export const remindNonSubmitters = withData(async (assignmentId: string) => {
  const s = db();
  const a = s.assignments.find((x) => x.id === assignmentId);
  if (!a) throw new Denied("Not found");
  await managerOf(a.cohortId);
  const missing = cohortRoster(a.cohortId).students.filter(
    (p) => !s.submissions.some((x) => x.assignmentId === a.id && x.userId === p.id),
  );
  for (const p of missing) {
    await notify(
      p.id,
      "notify.reminder",
      { title: a.title },
      `/cohorts/${a.cohortId}/assignments/${a.id}`,
      "reminders",
    );
  }
  done();
});

// ---------------------------------------------------------------------------
// Labs

export const reviewLab = withData(async (labId: string, userId: string, decision: "pass" | "return") => {
  if (decision !== "pass" && decision !== "return") throw new Denied("Invalid decision");
  const s = db();
  const lab = s.labs.find((l) => l.id === labId);
  if (!lab) throw new Denied("Not found");
  await managerOf(lab.cohortId);
  const attempt = s.labAttempts.find((a) => a.labId === labId && a.userId === userId);
  if (!attempt || attempt.status !== "submitted") throw new Denied("Only submitted labs can be reviewed");

  await update("labAttempts", attempt, {
    status: decision === "pass" ? "passed" : "in_progress",
    updatedAt: new Date(),
  });
  await notify(
    userId,
    decision === "pass" ? "notify.labPassed" : "notify.labReturned",
    { number: String(lab.number).padStart(2, "0") },
    `/cohorts/${lab.cohortId}/labs#${lab.id}`,
    "grades",
  );
  done();
});

// ---------------------------------------------------------------------------
// Attendance

const ATTENDANCE: readonly Attendance["status"][] = ["present", "late", "absent"];

export const saveAttendance = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  const s = db();
  const cls = s.classes.find((c) => c.id === form.get("classId"));
  if (!cls) return { error: t("errors.classNotFound") };
  await managerOf(cls.cohortId);
  if (cls.startsAt.getTime() - 10 * 60_000 > Date.now()) return { error: t("errors.attendanceNotOpen") };

  for (const student of cohortRoster(cls.cohortId).students) {
    const value = form.get(`att:${student.id}`);
    if (value === null) continue;
    if (!ATTENDANCE.includes(value as Attendance["status"])) return { error: t("errors.invalidAttendance") };
    const existing = s.attendance.find((a) => a.classId === cls.id && a.userId === student.id);
    const status = value as Attendance["status"];
    if (existing) {
      if (existing.status !== status) await update("attendance", existing, { status });
    } else {
      await insert("attendance", { classId: cls.id, userId: student.id, status });
    }
  }
  done();
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Classes

const PROVIDERS: readonly MeetingProvider[] = ["zoom", "google_meet", "livekit"];

/** The pasted link, or a fresh meeting from the provider's API when none was pasted. */
async function meetingLink(provider: MeetingProvider, pasted: string): Promise<{ url: string } | { error: string }> {
  if (pasted || !canCreateMeetings(provider)) return { url: pasted };
  try {
    return { url: await createMeeting(provider) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export const saveClass = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  const s = db();
  const cohortId = str(form, "cohortId", 100);
  const user = await managerOf(cohortId);
  const cohort = cohortById(cohortId)!;
  const classId = str(form, "classId", 100);
  const existing = classId ? s.classes.find((c) => c.id === classId && c.cohortId === cohortId) : undefined;
  if (classId && !existing) return { error: t("errors.classNotFound") };

  const title = str(form, "title", 140);
  const description = str(form, "description", 1000);
  const moduleId = str(form, "moduleId", 100);
  const startsAt = parseWallTime(str(form, "date", 10), str(form, "time", 5));
  const durationMin = int(form.get("durationMin"), 15, 300);
  const provider = str(form, "provider", 20) as MeetingProvider;
  const pastedUrl = str(form, "meetingUrl", 500);
  const recordingUrl = str(form, "recordingUrl", 500);

  if (!title) return { error: t("errors.addTitle") };
  if (!s.modules.some((m) => m.id === moduleId && m.programmeId === cohort.programmeId))
    return { error: t("errors.pickModule") };
  if (!startsAt) return { error: t("errors.invalidDateTime") };
  if (durationMin === null) return { error: t("errors.classDuration") };
  if (!PROVIDERS.includes(provider)) return { error: t("errors.pickProvider") };
  const link = await meetingLink(provider, pastedUrl);
  if ("error" in link) return link;
  const meetingUrl = link.url;
  if (!httpsUrl(meetingUrl)) return { error: t("errors.meetingLink") };
  if (recordingUrl && !httpsUrl(recordingUrl)) return { error: t("errors.recordingLink") };

  const fields = {
    title,
    description,
    moduleId,
    startsAt,
    durationMin,
    provider,
    meetingUrl,
    recordingUrl: recordingUrl || null,
  };
  if (existing) await update("classes", existing, fields);
  else await insert("classes", { id: newId("cl"), cohortId, instructorId: user.id, ...fields });
  done();
  redirect(`/admin/cohorts/${cohortId}/classes`);
});

export const deleteClass = withData(async (classId: string) => {
  const s = db();
  const cls = s.classes.find((c) => c.id === classId);
  if (!cls) throw new Denied("Not found");
  await managerOf(cls.cohortId);
  if (cls.startsAt < new Date()) throw new Denied("Past classes can't be deleted; they hold attendance.");
  await remove("classes", cls);
  done();
});

// ---------------------------------------------------------------------------
// Projects

const DEFAULT_MILESTONES = [
  "Architecture proposal",
  "Infrastructure in Terraform",
  "CI/CD and Kubernetes deploy",
  "Monitoring, security and demo",
];

export const createProject = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  const cohortId = str(form, "cohortId", 100);
  await managerOf(cohortId);
  const cohort = cohortById(cohortId)!;

  const teamName = str(form, "teamName", 80);
  const title = str(form, "title", 140) || "Capstone project";
  const memberIds = form.getAll("members").map(String);
  const free = new Set(unassignedStudents(cohortId).map((p) => p.id));
  if (!teamName) return { error: t("errors.nameTeam") };
  if (memberIds.length === 0) return { error: t("errors.pickStudents") };
  if (!memberIds.every((id) => free.has(id))) return { error: t("errors.oneTeamEach") };

  const id = newId("pr");
  await insert("projects", {
    id,
    cohortId,
    title,
    teamName,
    brief: str(form, "brief", 2000),
    repoUrl: null,
    presentsAt: null,
  });
  for (const userId of memberIds) await insert("projectMembers", { projectId: id, userId });
  for (const [i, t] of DEFAULT_MILESTONES.entries()) {
    await insert("milestones", {
      id: newId("ms"),
      projectId: id,
      position: i + 1,
      title: t,
      dueOn: cohort.endsOn,
      doneAt: null,
    });
  }
  done();
  return { ok: true };
});

export const updateProject = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  const s = db();
  const project = s.projects.find((p) => p.id === form.get("projectId"));
  if (!project) return { error: t("errors.projectNotFound") };
  await managerOf(project.cohortId);

  const teamName = str(form, "teamName", 80);
  if (!teamName) return { error: t("errors.nameTeam") };
  const date = str(form, "date", 10);
  const time = str(form, "time", 5);
  const presentsAt = date || time ? parseWallTime(date, time) : null;
  if ((date || time) && !presentsAt) return { error: t("errors.invalidPresentation") };

  const add = str(form, "addMember", 100);
  if (add && !unassignedStudents(project.cohortId).some((p) => p.id === add)) {
    return { error: t("errors.alreadyOnTeam") };
  }
  await update("projects", project, { teamName, presentsAt });
  if (add) await insert("projectMembers", { projectId: project.id, userId: add });
  done();
  return { ok: true };
});

export const removeProjectMember = withData(async (projectId: string, userId: string) => {
  const s = db();
  const project = s.projects.find((p) => p.id === projectId);
  if (!project) throw new Denied("Not found");
  await managerOf(project.cohortId);
  const member = s.projectMembers.find((m) => m.projectId === projectId && m.userId === userId);
  if (member) await remove("projectMembers", member);
  done();
});

/** Team members and cohort managers can tick milestones. */
async function projectEditor(projectId: string) {
  const s = db();
  const project = s.projects.find((p) => p.id === projectId);
  if (!project) throw new Denied("Not found");
  const user = await currentUser();
  const member = s.projectMembers.some((m) => m.projectId === projectId && m.userId === user.id);
  if (!member && !canManageCohort(user, project.cohortId)) throw new Denied("Not allowed");
  return { project, user };
}

export const toggleMilestone = withData(async (milestoneId: string) => {
  const s = db();
  const ms = s.milestones.find((m) => m.id === milestoneId);
  if (!ms) throw new Denied("Not found");
  await projectEditor(ms.projectId);
  await update("milestones", ms, { doneAt: ms.doneAt ? null : new Date() });
  done();
});

export const setProjectRepo = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  const { project } = await projectEditor(str(form, "projectId", 100));
  const repoUrl = str(form, "repoUrl", 500);
  if (repoUrl && !httpsUrl(repoUrl, REPO_HOSTS)) return { error: t("errors.repoLinkHost") };
  await update("projects", project, { repoUrl: repoUrl || null });
  done();
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Certificates (admin only)

export const issueCertificate = withData(async (userId: string, cohortId: string) => {
  const user = await admin();
  const s = db();
  const cohort = cohortById(cohortId);
  if (!cohort || !s.cohortMembers.some((m) => m.cohortId === cohortId && m.userId === userId && m.role === "student")) {
    throw new Denied("Not found");
  }
  if (s.certificates.some((c) => c.userId === userId && c.cohortId === cohortId)) throw new Denied("Already issued");
  if (progressFor(userId, cohort).percent < 100) throw new Denied("Programme not complete");

  const programme = programmeById(cohort.programmeId)!;
  const id = nextCertificateId(programme.certCode, zonedParts(new Date()).year);
  await insert("certificates", { id, userId, cohortId, issuedAt: new Date(), issuedBy: user.id, revokedAt: null });
  await notify(
    userId,
    "notify.certificate",
    { programme: programme.title },
    `/cohorts/${cohortId}/certificate`,
    "grades",
  );
  done();
});

export const setCertificateRevoked = withData(async (certificateId: string, revoked: boolean) => {
  await admin();
  if (typeof revoked !== "boolean") throw new Denied("Invalid value");
  const cert = db().certificates.find((c) => c.id === certificateId);
  if (!cert) throw new Denied("Not found");
  await update("certificates", cert, { revokedAt: revoked ? new Date() : null });
  done();
});

// ---------------------------------------------------------------------------
// Moderation

async function moderatablePost(postId: string) {
  const s = db();
  const post = s.posts.find((p) => p.id === postId);
  const space = post && s.spaces.find((sp) => sp.id === post.spaceId);
  if (!post || !space) throw new Denied("Not found");
  const user = await currentUser();
  return { s, post, space, user, moderator: canModerate(user, space) };
}

export const togglePin = withData(async (postId: string) => {
  const { post, moderator } = await moderatablePost(postId);
  if (!moderator) throw new Denied("Not allowed");
  await update("posts", post, { pinned: !post.pinned });
  done();
});

export const toggleLock = withData(async (postId: string) => {
  const { post, moderator } = await moderatablePost(postId);
  if (!moderator) throw new Denied("Not allowed");
  await update("posts", post, { locked: !post.locked });
  done();
});

/** Authors can delete their own post; moderators can delete any in their spaces. */
export const deletePost = withData(async (postId: string) => {
  const { s, post, space, user, moderator } = await moderatablePost(postId);
  if (!moderator && post.authorId !== user.id) throw new Denied("Not allowed");
  await remove("posts", post);
  // The database deletes its comments and reactions with it; mirror that here.
  s.comments = s.comments.filter((c) => c.postId !== postId);
  s.reactions = s.reactions.filter((r) => r.postId !== postId);
  done();
  redirect(`/community/${space.slug}`);
});

export const deleteComment = withData(async (commentId: string) => {
  const s = db();
  const comment = s.comments.find((c) => c.id === commentId);
  if (!comment) throw new Denied("Not found");
  const { user, moderator } = await moderatablePost(comment.postId);
  if (!moderator && comment.authorId !== user.id) throw new Denied("Not allowed");
  await remove("comments", comment);
  done();
});

// ---------------------------------------------------------------------------
// Curriculum (admin only)

const CERT_CODE = /^[A-Z]{2,5}$/;

const parseIncludes = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 12);

/**
 * An item's translations with the Arabic fields from the curriculum editor
 * (`ar:title`, `ar:summary`...; `max` gives each field's length limit).
 * An empty field means no Arabic version of it; a field the form doesn't send
 * stays as it was. `lists` are one entry per line, like the English includes.
 */
function withArabic<F extends object>(
  i18n: Translations<F> | null | undefined,
  form: FormData,
  max: { [K in keyof F]?: number },
  lists: (keyof F)[] = [],
): Translations<F> {
  const ar: Record<string, unknown> = { ...i18n?.ar };
  for (const [field, limit] of Object.entries(max) as [keyof F & string, number][]) {
    const key = `ar:${field}`;
    if (!form.has(key)) continue;
    const text = str(form, key, limit);
    const value = lists.includes(field) ? parseIncludes(text) : text;
    if (value.length > 0) ar[field] = value;
    else delete ar[field];
  }
  const next: Translations<F> = { ...i18n };
  if (Object.keys(ar).length > 0) next.ar = ar as Partial<F>;
  else delete next.ar;
  return next;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** `base` if nothing has it yet, otherwise `base` + sep + the first free number from 2. */
function firstFree(base: string, taken: (name: string) => boolean, sep = "-"): string {
  let name = base;
  let n = 2;
  while (taken(name)) name = `${base}${sep}${n++}`;
  return name;
}

/**
 * New programmes start as a draft with one empty module per week, so the
 * editor has something to fill in. Nothing is public until "Published" is ticked.
 */
export const createProgramme = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  await admin();
  const s = db();
  const title = str(form, "title", 100);
  const tagline = str(form, "tagline", 200);
  const description = str(form, "description", 2000);
  const weeks = int(form.get("weeks"), 1, 52);
  const priceDollars = int(form.get("price"), 0, 100_000);
  const certCode = str(form, "certCode", 5).toUpperCase();
  const includes = parseIncludes(str(form, "includes", 1000));

  if (!title) return { error: t("errors.addTitle") };
  if (weeks === null) return { error: t("errors.programmeLength") };
  if (priceDollars === null) return { error: t("errors.priceWhole") };
  if (!CERT_CODE.test(certCode)) return { error: t("errors.certCodeFormat") };
  if (s.programmes.some((p) => p.certCode === certCode)) {
    return { error: t("errors.certCodeTaken", { code: certCode }) };
  }

  const base = slugify(title) || "programme";
  const slug = firstFree(base, (name) => s.programmes.some((p) => p.slug === name));

  const id = newId("p");
  await insert("programmes", {
    id,
    slug,
    title,
    tagline,
    description,
    durationWeeks: weeks,
    priceCents: priceDollars * 100,
    currency: "USD",
    includes,
    certCode,
    published: false,
  });
  for (let week = 1; week <= weeks; week++) {
    await insert("modules", {
      id: newId("m"),
      programmeId: id,
      week,
      position: 1,
      title: `Week ${week}`,
      summary: "",
      i18n: { ar: { title: `الأسبوع ${week}` } },
    });
  }
  done();
  redirect(`/admin/programmes/${id}?created=1`);
});

const COHORT_SPACES = [
  {
    key: "general",
    name: "General",
    description: "Your cohort's home.",
    ar: { name: "عام", description: "المساحة الرئيسية لدفعتك." },
    readOnly: false,
  },
  {
    key: "announcements",
    name: "Announcements",
    description: "Schedule changes and cohort news.",
    ar: { name: "الإعلانات", description: "تغييرات الجدول وأخبار الدفعة." },
    readOnly: true,
  },
  {
    key: "questions",
    name: "Questions",
    description: "Stuck? Ask here. No question is too basic.",
    ar: { name: "الأسئلة", description: "واجهتك مشكلة؟ اسأل هنا. لا يوجد سؤال بسيط أكثر من اللازم." },
    readOnly: false,
  },
];

/** A cohort is one run of a programme: dates, an instructor and its own community spaces. */
export const createCohort = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  await admin();
  const s = db();
  const programme = s.programmes.find((p) => p.id === form.get("programmeId"));
  if (!programme) return { error: t("errors.pickProgramme") };
  const instructor = s.profiles.find(
    (p) => p.id === form.get("instructorId") && (p.role === "instructor" || p.role === "admin"),
  );
  if (!instructor) return { error: t("errors.pickInstructor") };
  const startsOn = parseWallTime(str(form, "startsOn", 10), "00:00");
  if (!startsOn) return { error: t("errors.pickStartDate") };
  const today = zonedParts(new Date());
  if (startsOn < wallTime(today.year, today.month, today.day)) return { error: t("errors.startInPast") };

  // Cohort numbers run across the whole academy: #00, #01, #02…
  const next = Math.max(-1, ...s.cohorts.map((c) => Number(c.code.replace(/\D/g, "")) || 0)) + 1;
  const num = String(next).padStart(2, "0");
  const cohort: Cohort = {
    id: newId("c"),
    programmeId: programme.id,
    code: `#${num}`,
    // Stored text, so in English whatever language the admin reads in.
    name: `${programme.title} · ${formatMonthYear(startsOn, "en")}`,
    startsOn,
    endsOn: addDays(startsOn, programme.durationWeeks * 7 - 1, "00:00"),
    status: startsOn <= new Date() ? "active" : "upcoming",
  };
  await insert("cohorts", cohort);
  await insert("cohortMembers", { cohortId: cohort.id, userId: instructor.id, role: "instructor" });
  for (const sp of COHORT_SPACES) {
    const slug = firstFree(`cohort-${num}-${sp.key}`, (name) => s.spaces.some((x) => x.slug === name));
    const space: Space = {
      id: newId("s"),
      slug,
      name: sp.name,
      group: `Cohort #${num}`,
      description: sp.description,
      cohortId: cohort.id,
      readOnly: sp.readOnly,
      i18n: { ar: { ...sp.ar, group: `الدفعة #${num}` } },
    };
    await insert("spaces", space);
  }
  await notify(
    instructor.id,
    "notify.teaching",
    { cohort: cohort.name, code: cohort.code },
    `/admin/cohorts/${cohort.id}`,
    "cohort",
  );
  done();
  redirect(`/admin/cohorts/${cohort.id}`);
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATAR_COLORS = ["#FF5A1F", "#2F6BFF", "#00A870", "#8B5CF6", "#E5484D", "#F5A524"];

/** An existing account can join as a student if it is one and isn't in the cohort yet. */
function existingStudent(t: T, userId: string, cohortId: string): { student: Profile } | { error: string } {
  const s = db();
  const profile = s.profiles.find((p) => p.id === userId);
  if (!profile) return { error: t("errors.accountIncomplete") };
  if (profile.role !== "student") {
    const key = profile.role === "admin" ? "errors.isAdminNotStudent" : "errors.isInstructorNotStudent";
    return { error: t(key, { name: profile.fullName }) };
  }
  if (s.cohortMembers.some((m) => m.cohortId === cohortId && m.userId === profile.id)) {
    return { error: t("errors.alreadyInCohort", { name: profile.fullName }) };
  }
  return { student: profile };
}

/** A new student account with a random temporary password they must change. */
async function createStudentAccount(email: string, fullName: string) {
  const s = db();
  const base =
    email
      .split("@")[0]
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || "student";
  const student: Profile = {
    id: newId("u"),
    fullName,
    handle: firstFree(base, (name) => s.profiles.some((p) => p.handle === name), ""),
    role: "student",
    headline: "",
    avatarColor: AVATAR_COLORS[s.profiles.length % AVATAR_COLORS.length],
  };
  const tempPassword = randomBytes(9).toString("base64url");
  s.profiles.push(student);
  s.accounts.push({
    userId: student.id,
    email,
    passwordHash: await hashPassword(tempPassword),
    mustChangePassword: true,
  });
  return { student, tempPassword };
}

/**
 * Adds a student to a cohort by email. An existing student account is added
 * as is. A new email gets a student account with a random temporary
 * password, returned once so the admin can pass it on (there's no invite
 * email until Phase 2). Only the hash is stored.
 */
export const addStudentToCohort = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  await admin();
  const s = db();
  const cohort = s.cohorts.find((c) => c.id === form.get("cohortId"));
  if (!cohort) return { error: t("errors.cohortNotFound") };
  if (cohort.status === "completed") return { error: t("errors.cohortFinished") };
  const email = str(form, "email", 254).toLowerCase();
  const fullName = str(form, "fullName", 100);
  if (!EMAIL.test(email)) return { error: t("errors.invalidEmail") };

  if (supabaseEnabled()) return inviteToCohort(t, cohort, email, fullName);

  const account = s.accounts.find((a) => a.email === email);
  let student: Profile;
  let tempPassword: string | null = null;
  if (account) {
    const found = existingStudent(t, account.userId, cohort.id);
    if ("error" in found) return found;
    student = found.student;
  } else {
    if (!fullName) return { error: t("errors.newStudentName") };
    ({ student, tempPassword } = await createStudentAccount(email, fullName));
  }

  await insert("cohortMembers", { cohortId: cohort.id, userId: student.id, role: "student" });
  await notify(student.id, "notify.welcome", { cohort: cohort.name }, `/cohorts/${cohort.id}`, "cohort");
  done();
  return {
    ok: true,
    message: tempPassword
      ? t("errors.studentCreated", { name: student.fullName, email, password: tempPassword })
      : t("errors.studentAdded", { name: student.fullName, email }),
  };
});

/**
 * Supabase version of adding a student: an existing account joins as is; a
 * new email gets an invite to choose their own password, so nobody ever
 * handles a temporary one. Needs SUPABASE_SECRET_KEY (server only).
 */
async function inviteToCohort(t: T, cohort: Cohort, email: string, fullName: string): Promise<FormState> {
  const supabase = createAdminClient();
  if (!supabase) return { error: t("errors.inviteNeedsKey") };

  const { data: foundId, error: lookupError } = await supabase.rpc("user_id_by_email", { lookup: email });
  if (lookupError) return { error: t("errors.accountServiceDown") };
  let userId = foundId as string | null;
  let invited = false;
  if (!userId) {
    if (!fullName) return { error: t("errors.newStudentName") };
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${siteUrl()}/auth/confirm?type=invite&next=${encodeURIComponent("/set-password?welcome=1")}`,
    });
    if (error || !data.user)
      return { error: t("errors.inviteFailed", { reason: error?.message ?? t("errors.unknownError") }) };
    userId = data.user.id;
    invited = true;
  }

  // A just-invited account isn't in this request's data yet.
  if (!db().profiles.some((p) => p.id === userId)) {
    const { data: row } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!row) return { error: t("errors.noProfileYet") };
    db().profiles.push(fromRow(TABLES.profiles, row) as unknown as Profile);
  }
  const found = existingStudent(t, userId, cohort.id);
  if ("error" in found) return found;
  const row = found.student;

  await insert("cohortMembers", { cohortId: cohort.id, userId, role: "student" });
  // A new person already gets the invite email; an existing one hears it here.
  await notify(
    userId,
    "notify.welcome",
    { cohort: cohort.name },
    `/cohorts/${cohort.id}`,
    invited ? undefined : "cohort",
  );
  done();
  return {
    ok: true,
    message: invited
      ? t("errors.studentInvited", { name: row.fullName, email })
      : t("errors.studentAdded", { name: row.fullName, email }),
  };
}

/**
 * Takes a student out of a cohort: they lose access to its classes, work and
 * spaces, and leave their capstone team. Their submissions, grades and posts
 * stay, so re-adding them later picks up where they left off.
 */
export const removeStudentFromCohort = withData(async (cohortId: string, userId: string) => {
  await admin();
  const s = db();
  const member = s.cohortMembers.find((m) => m.cohortId === cohortId && m.userId === userId);
  if (!member || member.role !== "student") throw new Denied("Not a student in this cohort");
  await remove("cohortMembers", member);
  const teams = new Set(s.projects.filter((p) => p.cohortId === cohortId).map((p) => p.id));
  await removeWhere("projectMembers", (pm) => pm.userId === userId && teams.has(pm.projectId));
  done();
});

// ---------------------------------------------------------------------------
// Office hours (cohort staff)

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Replace a cohort's weekly office hours. One window per weekday, start before end. */
export const saveOfficeHours = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  const cohortId = str(form, "cohortId", 100);
  await managerOf(cohortId);
  const slots: { cohortId: string; weekday: number; start: string; end: string }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    if (form.get(`on:${weekday}`) !== "on") continue;
    const start = str(form, `start:${weekday}`, 5);
    const end = str(form, `end:${weekday}`, 5);
    if (!HHMM.test(start) || !HHMM.test(end))
      return { error: t("errors.officeTimeFormat", { day: weekdayName(weekday) }) };
    if (start >= end) return { error: t("errors.officeTimeOrder", { day: weekdayName(weekday) }) };
    slots.push({ cohortId, weekday, start, end });
  }
  await removeWhere("officeHours", (x) => x.cohortId === cohortId);
  for (const slot of slots) await insert("officeHours", slot);
  done();
  return { ok: true };
});

/** An instructor answers a student. Allowed any time; only students are held to the hours. */
export const replyOfficeMessage = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  const s = db();
  const thread = s.officeThreads.find((t) => t.id === form.get("threadId"));
  if (!thread) return { error: t("errors.conversationNotFound") };
  const user = await managerOf(thread.cohortId);
  const body = str(form, "body", 2000);
  if (!body) return { error: t("errors.writeReply") };
  const now = new Date();
  await insert("officeMessages", { id: newId("om"), threadId: thread.id, authorId: user.id, body, createdAt: now });
  await update("officeThreads", thread, { instructorReadAt: now });
  // The database moves last_message_at itself (0009); keep this request's copy in step.
  thread.lastMessageAt = now;
  await notify(
    thread.studentId,
    "notify.officeReply",
    { name: user.fullName.split(" ")[0] },
    `/cohorts/${thread.cohortId}/office-hours`,
    "office_hours",
  );
  done();
  return { ok: true };
});

export const updateProgramme = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  await admin();
  const programme = db().programmes.find((p) => p.id === form.get("programmeId"));
  if (!programme) return { error: t("errors.programmeNotFound") };
  const title = str(form, "title", 100);
  const tagline = str(form, "tagline", 200);
  const description = str(form, "description", 2000);
  const priceDollars = int(form.get("price"), 0, 100_000);
  if (!title) return { error: t("errors.addTitle") };
  if (priceDollars === null) return { error: t("errors.priceWhole") };
  await update("programmes", programme, {
    title,
    tagline,
    description,
    priceCents: priceDollars * 100,
    published: form.get("published") === "on",
    ...(form.has("includes") ? { includes: parseIncludes(str(form, "includes", 1000)) } : {}),
    i18n: withArabic(programme.i18n, form, { title: 100, tagline: 200, description: 2000, includes: 1000 }, [
      "includes",
    ]),
  });
  done();
  return { ok: true };
});

export const updateModule = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  await admin();
  const mod = db().modules.find((m) => m.id === form.get("moduleId"));
  if (!mod) return { error: t("errors.moduleNotFound") };
  const title = str(form, "title", 140);
  if (!title) return { error: t("errors.addTitle") };
  await update("modules", mod, {
    title,
    summary: str(form, "summary", 500),
    i18n: withArabic(mod.i18n, form, { title: 140, summary: 500 }),
  });
  done();
  return { ok: true };
});

const LESSON_KINDS: readonly LessonKind[] = ["reading", "video", "exercise"];

export const saveLesson = withData(async (_prev: FormState, form: FormData): Promise<FormState> => {
  const { t } = await getI18n();
  await admin();
  const s = db();
  const mod = s.modules.find((m) => m.id === form.get("moduleId"));
  if (!mod) return { error: t("errors.moduleNotFound") };
  const lessonId = str(form, "lessonId", 100);
  const existing = lessonId ? s.lessons.find((l) => l.id === lessonId && l.moduleId === mod.id) : undefined;
  if (lessonId && !existing) return { error: t("errors.lessonNotFound") };

  const title = str(form, "title", 140);
  const kind = str(form, "kind", 20) as LessonKind;
  const durationMin = int(form.get("durationMin"), 1, 600);
  if (!title) return { error: t("errors.addTitle") };
  if (!LESSON_KINDS.includes(kind)) return { error: t("errors.pickLessonType") };
  if (durationMin === null) return { error: t("errors.lessonDuration") };
  const body = str(form, "body", 20_000);

  const i18n = withArabic(existing?.i18n, form, { title: 140, body: 20_000 });

  if (existing) {
    await update("lessons", existing, { title, kind, durationMin, body, i18n });
  } else {
    const position = Math.max(0, ...s.lessons.filter((l) => l.moduleId === mod.id).map((l) => l.position)) + 1;
    await insert("lessons", { id: newId("l"), moduleId: mod.id, position, title, kind, durationMin, body, i18n });
  }
  done();
  return { ok: true };
});

export const deleteLesson = withData(async (lessonId: string) => {
  await admin();
  const s = db();
  const lesson = s.lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Denied("Not found");
  await remove("lessons", lesson);
  // The database deletes progress on it too; mirror that here.
  s.lessonProgress = s.lessonProgress.filter((p) => p.lessonId !== lessonId);
  // Close the gap. Lowest first, so no two lessons ever share a position.
  const rest = s.lessons.filter((l) => l.moduleId === lesson.moduleId).sort((a, b) => a.position - b.position);
  for (const [i, l] of rest.entries()) if (l.position !== i + 1) await update("lessons", l, { position: i + 1 });
  done();
});

export const moveLesson = withData(async (lessonId: string, direction: "up" | "down") => {
  await admin();
  if (direction !== "up" && direction !== "down") throw new Denied("Invalid direction");
  const s = db();
  const lesson = s.lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Denied("Not found");
  const siblings = s.lessons.filter((l) => l.moduleId === lesson.moduleId).sort((a, b) => a.position - b.position);
  const i = siblings.indexOf(lesson);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return;
  // Positions are unique per module, so swap through a free slot.
  const [a, b] = [siblings[i], siblings[j]];
  const [pa, pb] = [a.position, b.position];
  await update("lessons", a, { position: 0 });
  await update("lessons", b, { position: pa });
  await update("lessons", a, { position: pb });
  done();
});
