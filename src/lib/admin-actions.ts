"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, newId } from "@/lib/data/store";
import { cohortRoster, programmeById, progressFor } from "@/lib/data/repo";
import { cohortById, nextCertificateId, unassignedStudents } from "@/lib/data/admin";
import { canManageCohort, canModerate, isAdmin } from "@/lib/authz";
import { canCreateMeetings, createMeeting } from "@/lib/integrations/video";
import { currentUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth/password";
import { randomBytes } from "node:crypto";
import { addDays, formatMonthYear, wallTime, zonedParts } from "@/lib/time";
import type { FormState } from "@/lib/actions";
import type { Attendance, Cohort, LessonKind, MeetingProvider, Profile, Space } from "@/lib/types";

// Admin-area writes. Every action is reachable by direct POST, so each one
// re-checks the caller and validates every input at runtime; TypeScript
// types on arguments are not a guarantee (see security review #2).

// ---------------------------------------------------------------------------
// Helpers

class Denied extends Error {}

function notify(userId: string, text: string, href: string) {
  db().notifications.push({ id: newId("n"), userId, text, href, createdAt: new Date(), readAt: null });
}

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

export async function gradeSubmission(_prev: FormState, form: FormData): Promise<FormState> {
  const s = db();
  const sub = s.submissions.find((x) => x.id === form.get("submissionId"));
  const assignment = sub && s.assignments.find((a) => a.id === sub.assignmentId);
  if (!sub || !assignment) return { error: "Submission not found." };
  const user = await managerOf(assignment.cohortId);

  const scores: Record<string, number> = {};
  for (const c of assignment.rubric) {
    const v = int(form.get(`score:${c.id}`), 0, c.points);
    if (v === null) return { error: `${c.label}: enter a whole number from 0 to ${c.points}.` };
    scores[c.id] = v;
  }
  const total = assignment.rubric.reduce((n, c) => n + c.points, 0);
  const earned = Object.values(scores).reduce((n, v) => n + v, 0);
  const feedback = str(form, "feedback", 5000);
  if (!feedback) return { error: "Write some feedback. Students learn more from it than from the number." };

  const first = sub.grade == null;
  Object.assign(sub, {
    rubricScores: scores,
    grade: total === 0 ? 0 : Math.round((earned / total) * 100),
    feedback,
    gradedBy: user.id,
    gradedAt: new Date(),
  });
  notify(
    sub.userId,
    `${first ? "Your" : "Updated grade on your"} assignment “${assignment.title}”: ${sub.grade}/100`,
    `/cohorts/${assignment.cohortId}/assignments/${assignment.id}`,
  );
  done();

  // "Save and next ungraded". Only a student in this cohort, so the target can't be steered elsewhere.
  const next = form.get("next");
  if (typeof next === "string" && cohortRoster(assignment.cohortId).students.some((p) => p.id === next)) {
    const q = new URLSearchParams({ student: next, graded: sub.userId });
    redirect(`/admin/cohorts/${assignment.cohortId}/grading/${assignment.id}?${q}`);
  }
  return { ok: true };
}

export async function remindNonSubmitters(assignmentId: string) {
  const s = db();
  const a = s.assignments.find((x) => x.id === assignmentId);
  if (!a) throw new Denied("Not found");
  await managerOf(a.cohortId);
  const missing = cohortRoster(a.cohortId).students.filter(
    (p) => !s.submissions.some((x) => x.assignmentId === a.id && x.userId === p.id),
  );
  for (const p of missing) {
    notify(p.id, `Reminder: “${a.title}” hasn't been submitted yet`, `/cohorts/${a.cohortId}/assignments/${a.id}`);
  }
  done();
}

// ---------------------------------------------------------------------------
// Labs

export async function reviewLab(labId: string, userId: string, decision: "pass" | "return") {
  if (decision !== "pass" && decision !== "return") throw new Denied("Invalid decision");
  const s = db();
  const lab = s.labs.find((l) => l.id === labId);
  if (!lab) throw new Denied("Not found");
  await managerOf(lab.cohortId);
  const attempt = s.labAttempts.find((a) => a.labId === labId && a.userId === userId);
  if (!attempt || attempt.status !== "submitted") throw new Denied("Only submitted labs can be reviewed");

  attempt.status = decision === "pass" ? "passed" : "in_progress";
  attempt.updatedAt = new Date();
  const label = `Lab #${String(lab.number).padStart(2, "0")}`;
  notify(
    userId,
    decision === "pass" ? `${label} marked as passed` : `${label} was returned. Check the objectives and resubmit.`,
    `/cohorts/${lab.cohortId}/labs#${lab.id}`,
  );
  done();
}

// ---------------------------------------------------------------------------
// Attendance

const ATTENDANCE: readonly Attendance["status"][] = ["present", "late", "absent"];

export async function saveAttendance(_prev: FormState, form: FormData): Promise<FormState> {
  const s = db();
  const cls = s.classes.find((c) => c.id === form.get("classId"));
  if (!cls) return { error: "Class not found." };
  await managerOf(cls.cohortId);
  if (cls.startsAt.getTime() - 10 * 60_000 > Date.now()) return { error: "Attendance opens when the class starts." };

  for (const student of cohortRoster(cls.cohortId).students) {
    const value = form.get(`att:${student.id}`);
    if (value === null) continue;
    if (!ATTENDANCE.includes(value as Attendance["status"])) return { error: "Invalid attendance value." };
    const existing = s.attendance.find((a) => a.classId === cls.id && a.userId === student.id);
    if (existing) existing.status = value as Attendance["status"];
    else s.attendance.push({ classId: cls.id, userId: student.id, status: value as Attendance["status"] });
  }
  done();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Classes

const PROVIDERS: readonly MeetingProvider[] = ["zoom", "google_meet", "livekit"];

export async function saveClass(_prev: FormState, form: FormData): Promise<FormState> {
  const s = db();
  const cohortId = str(form, "cohortId", 100);
  const user = await managerOf(cohortId);
  const cohort = cohortById(cohortId)!;
  const classId = str(form, "classId", 100);
  const existing = classId ? s.classes.find((c) => c.id === classId && c.cohortId === cohortId) : undefined;
  if (classId && !existing) return { error: "Class not found." };

  const title = str(form, "title", 140);
  const description = str(form, "description", 1000);
  const moduleId = str(form, "moduleId", 100);
  const startsAt = parseWallTime(str(form, "date", 10), str(form, "time", 5));
  const durationMin = int(form.get("durationMin"), 15, 300);
  const provider = str(form, "provider", 20) as MeetingProvider;
  let meetingUrl = str(form, "meetingUrl", 500);
  const recordingUrl = str(form, "recordingUrl", 500);

  if (!title) return { error: "Add a title." };
  if (!s.modules.some((m) => m.id === moduleId && m.programmeId === cohort.programmeId))
    return { error: "Pick a module." };
  if (!startsAt) return { error: "Enter a valid date and time." };
  if (durationMin === null) return { error: "Duration must be 15 to 300 minutes." };
  if (!PROVIDERS.includes(provider)) return { error: "Pick a video provider." };
  if (!meetingUrl && canCreateMeetings(provider)) {
    try {
      meetingUrl = await createMeeting(provider);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  if (!httpsUrl(meetingUrl)) return { error: "Paste the meeting link (https://…)." };
  if (recordingUrl && !httpsUrl(recordingUrl)) return { error: "Recording link must start with https://." };

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
  if (existing) {
    Object.assign(existing, fields);
  } else {
    s.classes.push({ id: newId("cl"), cohortId, instructorId: user.id, ...fields });
  }
  done();
  redirect(`/admin/cohorts/${cohortId}/classes`);
}

export async function deleteClass(classId: string) {
  const s = db();
  const cls = s.classes.find((c) => c.id === classId);
  if (!cls) throw new Denied("Not found");
  await managerOf(cls.cohortId);
  if (cls.startsAt < new Date()) throw new Denied("Past classes can't be deleted; they hold attendance.");
  s.classes.splice(s.classes.indexOf(cls), 1);
  done();
}

// ---------------------------------------------------------------------------
// Projects

const DEFAULT_MILESTONES = [
  "Architecture proposal",
  "Infrastructure in Terraform",
  "CI/CD and Kubernetes deploy",
  "Monitoring, security and demo",
];

export async function createProject(_prev: FormState, form: FormData): Promise<FormState> {
  const s = db();
  const cohortId = str(form, "cohortId", 100);
  await managerOf(cohortId);
  const cohort = cohortById(cohortId)!;

  const teamName = str(form, "teamName", 80);
  const title = str(form, "title", 140) || "Capstone project";
  const memberIds = form.getAll("members").map(String);
  const free = new Set(unassignedStudents(cohortId).map((p) => p.id));
  if (!teamName) return { error: "Name the team." };
  if (memberIds.length === 0) return { error: "Pick at least one student." };
  if (!memberIds.every((id) => free.has(id))) return { error: "Each student can only be on one team." };

  const id = newId("pr");
  s.projects.push({ id, cohortId, title, teamName, brief: str(form, "brief", 2000), repoUrl: null, presentsAt: null });
  for (const userId of memberIds) s.projectMembers.push({ projectId: id, userId });
  DEFAULT_MILESTONES.forEach((t, i) =>
    s.milestones.push({
      id: newId("ms"),
      projectId: id,
      position: i + 1,
      title: t,
      dueOn: cohort.endsOn,
      doneAt: null,
    }),
  );
  done();
  return { ok: true };
}

export async function updateProject(_prev: FormState, form: FormData): Promise<FormState> {
  const s = db();
  const project = s.projects.find((p) => p.id === form.get("projectId"));
  if (!project) return { error: "Project not found." };
  await managerOf(project.cohortId);

  const teamName = str(form, "teamName", 80);
  if (!teamName) return { error: "Name the team." };
  const date = str(form, "date", 10);
  const time = str(form, "time", 5);
  const presentsAt = date || time ? parseWallTime(date, time) : null;
  if ((date || time) && !presentsAt) return { error: "Enter a valid presentation date and time." };

  Object.assign(project, { teamName, presentsAt });
  const add = str(form, "addMember", 100);
  if (add) {
    if (!unassignedStudents(project.cohortId).some((p) => p.id === add))
      return { error: "That student is already on a team." };
    s.projectMembers.push({ projectId: project.id, userId: add });
  }
  done();
  return { ok: true };
}

export async function removeProjectMember(projectId: string, userId: string) {
  const s = db();
  const project = s.projects.find((p) => p.id === projectId);
  if (!project) throw new Denied("Not found");
  await managerOf(project.cohortId);
  const i = s.projectMembers.findIndex((m) => m.projectId === projectId && m.userId === userId);
  if (i >= 0) s.projectMembers.splice(i, 1);
  done();
}

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

export async function toggleMilestone(milestoneId: string) {
  const s = db();
  const ms = s.milestones.find((m) => m.id === milestoneId);
  if (!ms) throw new Denied("Not found");
  await projectEditor(ms.projectId);
  ms.doneAt = ms.doneAt ? null : new Date();
  done();
}

export async function setProjectRepo(_prev: FormState, form: FormData): Promise<FormState> {
  const { project } = await projectEditor(str(form, "projectId", 100));
  const repoUrl = str(form, "repoUrl", 500);
  if (repoUrl && !httpsUrl(repoUrl, REPO_HOSTS)) return { error: "Use a GitHub, GitLab or Azure DevOps https link." };
  project.repoUrl = repoUrl || null;
  done();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Certificates (admin only)

export async function issueCertificate(userId: string, cohortId: string) {
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
  s.certificates.push({ id, userId, cohortId, issuedAt: new Date(), issuedBy: user.id, revokedAt: null });
  notify(userId, `Your ${programme.title} certificate is ready`, `/cohorts/${cohortId}/certificate`);
  done();
}

export async function setCertificateRevoked(certificateId: string, revoked: boolean) {
  await admin();
  if (typeof revoked !== "boolean") throw new Denied("Invalid value");
  const cert = db().certificates.find((c) => c.id === certificateId);
  if (!cert) throw new Denied("Not found");
  cert.revokedAt = revoked ? new Date() : null;
  done();
}

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

export async function togglePin(postId: string) {
  const { post, moderator } = await moderatablePost(postId);
  if (!moderator) throw new Denied("Not allowed");
  post.pinned = !post.pinned;
  done();
}

export async function toggleLock(postId: string) {
  const { post, moderator } = await moderatablePost(postId);
  if (!moderator) throw new Denied("Not allowed");
  post.locked = !post.locked;
  done();
}

/** Authors can delete their own post; moderators can delete any in their spaces. */
export async function deletePost(postId: string) {
  const { s, post, space, user, moderator } = await moderatablePost(postId);
  if (!moderator && post.authorId !== user.id) throw new Denied("Not allowed");
  s.posts.splice(s.posts.indexOf(post), 1);
  s.comments = s.comments.filter((c) => c.postId !== postId);
  s.reactions = s.reactions.filter((r) => r.postId !== postId);
  done();
  redirect(`/community/${space.slug}`);
}

export async function deleteComment(commentId: string) {
  const s = db();
  const comment = s.comments.find((c) => c.id === commentId);
  if (!comment) throw new Denied("Not found");
  const { user, moderator } = await moderatablePost(comment.postId);
  if (!moderator && comment.authorId !== user.id) throw new Denied("Not allowed");
  s.comments.splice(s.comments.indexOf(comment), 1);
  done();
}

// ---------------------------------------------------------------------------
// Curriculum (admin only)

const CERT_CODE = /^[A-Z]{2,5}$/;

const parseIncludes = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 12);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * New programmes start as a draft with one empty module per week, so the
 * editor has something to fill in. Nothing is public until "Published" is ticked.
 */
export async function createProgramme(_prev: FormState, form: FormData): Promise<FormState> {
  await admin();
  const s = db();
  const title = str(form, "title", 100);
  const tagline = str(form, "tagline", 200);
  const description = str(form, "description", 2000);
  const weeks = int(form.get("weeks"), 1, 52);
  const priceDollars = int(form.get("price"), 0, 100_000);
  const certCode = str(form, "certCode", 5).toUpperCase();
  const includes = parseIncludes(str(form, "includes", 1000));

  if (!title) return { error: "Add a title." };
  if (weeks === null) return { error: "Length must be between 1 and 52 weeks." };
  if (priceDollars === null) return { error: "Price must be a whole number of US dollars." };
  if (!CERT_CODE.test(certCode)) return { error: "Certificate code: 2 to 5 letters, like DEV or AI." };
  if (s.programmes.some((p) => p.certCode === certCode)) {
    return { error: `Another programme already uses ${certCode} on its certificates. Pick a different code.` };
  }

  const base = slugify(title) || "programme";
  let slug = base;
  for (let i = 2; s.programmes.some((p) => p.slug === slug); i++) slug = `${base}-${i}`;

  const id = newId("p");
  s.programmes.push({
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
    s.modules.push({ id: newId("m"), programmeId: id, week, position: 1, title: `Week ${week}`, summary: "" });
  }
  done();
  redirect(`/admin/programmes/${id}?created=1`);
}

const COHORT_SPACES = [
  { key: "general", name: "General", description: "Your cohort's home.", readOnly: false },
  { key: "announcements", name: "Announcements", description: "Schedule changes and cohort news.", readOnly: true },
  { key: "questions", name: "Questions", description: "Stuck? Ask here. No question is too basic.", readOnly: false },
];

/** A cohort is one run of a programme: dates, an instructor and its own community spaces. */
export async function createCohort(_prev: FormState, form: FormData): Promise<FormState> {
  await admin();
  const s = db();
  const programme = s.programmes.find((p) => p.id === form.get("programmeId"));
  if (!programme) return { error: "Pick a programme." };
  const instructor = s.profiles.find(
    (p) => p.id === form.get("instructorId") && (p.role === "instructor" || p.role === "admin"),
  );
  if (!instructor) return { error: "Pick an instructor." };
  const startsOn = parseWallTime(str(form, "startsOn", 10), "00:00");
  if (!startsOn) return { error: "Pick a start date." };
  const today = zonedParts(new Date());
  if (startsOn < wallTime(today.year, today.month, today.day)) return { error: "The start date can't be in the past." };

  // Cohort numbers run across the whole academy: #00, #01, #02…
  const next = Math.max(-1, ...s.cohorts.map((c) => Number(c.code.replace(/\D/g, "")) || 0)) + 1;
  const num = String(next).padStart(2, "0");
  const cohort: Cohort = {
    id: newId("c"),
    programmeId: programme.id,
    code: `#${num}`,
    name: `${programme.title} · ${formatMonthYear(startsOn)}`,
    startsOn,
    endsOn: addDays(startsOn, programme.durationWeeks * 7 - 1, "00:00"),
    status: startsOn <= new Date() ? "active" : "upcoming",
  };
  s.cohorts.push(cohort);
  s.cohortMembers.push({ cohortId: cohort.id, userId: instructor.id, role: "instructor" });
  for (const sp of COHORT_SPACES) {
    let slug = `cohort-${num}-${sp.key}`;
    for (let i = 2; s.spaces.some((x) => x.slug === slug); i++) slug = `cohort-${num}-${sp.key}-${i}`;
    const space: Space = {
      id: newId("s"),
      slug,
      name: sp.name,
      group: `Cohort #${num}`,
      description: sp.description,
      cohortId: cohort.id,
      readOnly: sp.readOnly,
    };
    s.spaces.push(space);
  }
  notify(instructor.id, `You're teaching ${cohort.name} (cohort ${cohort.code})`, `/admin/cohorts/${cohort.id}`);
  done();
  redirect(`/admin/cohorts/${cohort.id}`);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATAR_COLORS = ["#FF5A1F", "#2F6BFF", "#00A870", "#8B5CF6", "#E5484D", "#F5A524"];

/**
 * Adds a student to a cohort by email. An existing student account is added
 * as is. A new email gets a student account with a random temporary
 * password, returned once so the admin can pass it on (there's no invite
 * email until Phase 2). Only the hash is stored.
 */
export async function addStudentToCohort(_prev: FormState, form: FormData): Promise<FormState> {
  await admin();
  const s = db();
  const cohort = s.cohorts.find((c) => c.id === form.get("cohortId"));
  if (!cohort) return { error: "Cohort not found." };
  if (cohort.status === "completed")
    return { error: "This cohort has finished. Add them to a current or upcoming one." };
  const email = str(form, "email", 254).toLowerCase();
  const fullName = str(form, "fullName", 100);
  if (!EMAIL.test(email)) return { error: "Enter a valid email address." };

  const account = s.accounts.find((a) => a.email === email);
  let student: Profile;
  let tempPassword: string | null = null;
  if (account) {
    const profile = s.profiles.find((p) => p.id === account.userId);
    if (!profile) return { error: "That account is incomplete. Contact support." };
    if (profile.role !== "student")
      return {
        error: `${profile.fullName} is ${profile.role === "admin" ? "an admin" : "an instructor"}, not a student.`,
      };
    if (s.cohortMembers.some((m) => m.cohortId === cohort.id && m.userId === profile.id)) {
      return { error: `${profile.fullName} is already in this cohort.` };
    }
    student = profile;
  } else {
    if (!fullName) return { error: "New student: add their full name too." };
    const base =
      email
        .split("@")[0]
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20) || "student";
    let handle = base;
    for (let i = 2; s.profiles.some((p) => p.handle === handle); i++) handle = `${base}${i}`;
    student = {
      id: newId("u"),
      fullName,
      handle,
      role: "student",
      headline: "",
      avatarColor: AVATAR_COLORS[s.profiles.length % AVATAR_COLORS.length],
    };
    tempPassword = randomBytes(9).toString("base64url");
    s.profiles.push(student);
    s.accounts.push({
      userId: student.id,
      email,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    });
  }

  s.cohortMembers.push({ cohortId: cohort.id, userId: student.id, role: "student" });
  notify(student.id, `Welcome to ${cohort.name}`, `/cohorts/${cohort.id}`);
  done();
  return {
    ok: true,
    message: tempPassword
      ? `Created an account for ${student.fullName} (${email}) and added them. Temporary password: ${tempPassword}. Send it to them privately; it won't be shown again.`
      : `Added ${student.fullName} (${email}) to the cohort.`,
  };
}

/**
 * Takes a student out of a cohort: they lose access to its classes, work and
 * spaces, and leave their capstone team. Their submissions, grades and posts
 * stay, so re-adding them later picks up where they left off.
 */
export async function removeStudentFromCohort(cohortId: string, userId: string) {
  await admin();
  const s = db();
  const member = s.cohortMembers.find((m) => m.cohortId === cohortId && m.userId === userId);
  if (!member || member.role !== "student") throw new Denied("Not a student in this cohort");
  s.cohortMembers.splice(s.cohortMembers.indexOf(member), 1);
  const teams = new Set(s.projects.filter((p) => p.cohortId === cohortId).map((p) => p.id));
  s.projectMembers = s.projectMembers.filter((pm) => !(pm.userId === userId && teams.has(pm.projectId)));
  done();
}

export async function updateProgramme(_prev: FormState, form: FormData): Promise<FormState> {
  await admin();
  const programme = db().programmes.find((p) => p.id === form.get("programmeId"));
  if (!programme) return { error: "Programme not found." };
  const title = str(form, "title", 100);
  const tagline = str(form, "tagline", 200);
  const description = str(form, "description", 2000);
  const priceDollars = int(form.get("price"), 0, 100_000);
  if (!title) return { error: "Add a title." };
  if (priceDollars === null) return { error: "Price must be a whole number of US dollars." };
  Object.assign(programme, {
    title,
    tagline,
    description,
    priceCents: priceDollars * 100,
    published: form.get("published") === "on",
    ...(form.has("includes") ? { includes: parseIncludes(str(form, "includes", 1000)) } : {}),
  });
  done();
  return { ok: true };
}

export async function updateModule(_prev: FormState, form: FormData): Promise<FormState> {
  await admin();
  const mod = db().modules.find((m) => m.id === form.get("moduleId"));
  if (!mod) return { error: "Module not found." };
  const title = str(form, "title", 140);
  if (!title) return { error: "Add a title." };
  Object.assign(mod, { title, summary: str(form, "summary", 500) });
  done();
  return { ok: true };
}

const LESSON_KINDS: readonly LessonKind[] = ["reading", "video", "exercise"];

export async function saveLesson(_prev: FormState, form: FormData): Promise<FormState> {
  await admin();
  const s = db();
  const mod = s.modules.find((m) => m.id === form.get("moduleId"));
  if (!mod) return { error: "Module not found." };
  const lessonId = str(form, "lessonId", 100);
  const existing = lessonId ? s.lessons.find((l) => l.id === lessonId && l.moduleId === mod.id) : undefined;
  if (lessonId && !existing) return { error: "Lesson not found." };

  const title = str(form, "title", 140);
  const kind = str(form, "kind", 20) as LessonKind;
  const durationMin = int(form.get("durationMin"), 1, 600);
  if (!title) return { error: "Add a title." };
  if (!LESSON_KINDS.includes(kind)) return { error: "Pick a lesson type." };
  if (durationMin === null) return { error: "Duration must be 1 to 600 minutes." };
  const body = str(form, "body", 20_000);

  if (existing) {
    Object.assign(existing, { title, kind, durationMin, body });
  } else {
    const position = Math.max(0, ...s.lessons.filter((l) => l.moduleId === mod.id).map((l) => l.position)) + 1;
    s.lessons.push({ id: newId("l"), moduleId: mod.id, position, title, kind, durationMin, body });
  }
  done();
  return { ok: true };
}

export async function deleteLesson(lessonId: string) {
  await admin();
  const s = db();
  const lesson = s.lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Denied("Not found");
  s.lessons.splice(s.lessons.indexOf(lesson), 1);
  s.lessonProgress = s.lessonProgress.filter((p) => p.lessonId !== lessonId);
  s.lessons
    .filter((l) => l.moduleId === lesson.moduleId)
    .sort((a, b) => a.position - b.position)
    .forEach((l, i) => (l.position = i + 1));
  done();
}

export async function moveLesson(lessonId: string, direction: "up" | "down") {
  await admin();
  if (direction !== "up" && direction !== "down") throw new Denied("Invalid direction");
  const s = db();
  const lesson = s.lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Denied("Not found");
  const siblings = s.lessons.filter((l) => l.moduleId === lesson.moduleId).sort((a, b) => a.position - b.position);
  const i = siblings.indexOf(lesson);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return;
  [siblings[i].position, siblings[j].position] = [siblings[j].position, siblings[i].position];
  done();
}
