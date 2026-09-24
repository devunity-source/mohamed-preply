import "server-only";
import { db } from "./store";
import {
  cohortAssignments,
  cohortClasses,
  cohortLabs,
  cohortRoster,
  labStatus,
  profileById,
  programmeById,
  progressFor,
  submissionFor,
} from "./repo";
import type { Certificate, Cohort, Milestone, Profile, Project } from "@/lib/types";

// Read-side queries for the admin area. Callers must check access first
// (src/lib/authz.ts); these functions don't.

export function cohortById(id: string): Cohort | undefined {
  return db().cohorts.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Cohort dashboard

export interface StudentRow {
  profile: Profile;
  progress: number;
  attendance: number | null; // null until a class has happened
  submitted: number;
  due: number;
  labsPending: number; // submitted, waiting for review
  atRisk: string[]; // human-readable reasons
}

const pct = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 100));

export function cohortStats(cohortId: string, now: Date) {
  const s = db();
  const cohort = cohortById(cohortId)!;
  const programme = programmeById(cohort.programmeId)!;
  const { students, instructors } = cohortRoster(cohortId);

  const pastClasses = cohortClasses(cohortId).filter((c) => c.startsAt < now);
  const dueAssignments = cohortAssignments(cohortId).filter((a) => a.dueAt < now);
  const labs = cohortLabs(cohortId);

  const rows: StudentRow[] = students.map((profile) => {
    const attended = s.attendance.filter(
      (a) => a.userId === profile.id && a.status !== "absent" && pastClasses.some((c) => c.id === a.classId),
    ).length;
    const attendance = pct(attended, pastClasses.length);
    const submitted = dueAssignments.filter((a) => submissionFor(profile.id, a.id)).length;
    const progress = progressFor(profile.id, cohort).percent;
    const labsPending = labs.filter((l) => labStatus(profile.id, l.id) === "submitted").length;
    return { profile, progress, attendance, submitted, due: dueAssignments.length, labsPending, atRisk: [] };
  });

  const avgProgress = rows.length ? Math.round(rows.reduce((n, r) => n + r.progress, 0) / rows.length) : 0;
  for (const r of rows) {
    if (r.due - r.submitted > 0)
      r.atRisk.push(`${r.due - r.submitted} missing submission${r.due - r.submitted > 1 ? "s" : ""}`);
    if (r.attendance !== null && r.attendance < 75) r.atRisk.push(`attendance ${r.attendance}%`);
    if (rows.length > 2 && r.progress < avgProgress - 15)
      r.atRisk.push(`progress ${r.progress}% (avg ${avgProgress}%)`);
  }

  const attendanceSlots = pastClasses.length * students.length;
  const attendedTotal = s.attendance.filter(
    (a) => a.status !== "absent" && pastClasses.some((c) => c.id === a.classId),
  ).length;
  const submissionSlots = dueAssignments.length * students.length;
  const submittedTotal = rows.reduce((n, r) => n + r.submitted, 0);

  const toGrade = cohortAssignments(cohortId).reduce(
    (n, a) => n + s.submissions.filter((x) => x.assignmentId === a.id && x.grade == null).length,
    0,
  );
  const labsToReview = rows.reduce((n, r) => n + r.labsPending, 0);

  const upcoming = [
    ...cohortClasses(cohortId)
      .filter((c) => c.startsAt >= now)
      .slice(0, 3)
      .map((c) => ({ id: c.id, kind: "class" as const, title: c.title, at: c.startsAt })),
    ...cohortAssignments(cohortId)
      .filter((a) => a.dueAt >= now)
      .slice(0, 2)
      .map((a) => ({ id: a.id, kind: "deadline" as const, title: `Due: ${a.title}`, at: a.dueAt })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    cohort,
    programme,
    instructors,
    students: rows,
    // No payments yet: enrolled students x list price. Replaced by Stripe data in Phase 2.
    estimatedRevenueCents: students.length * programme.priceCents,
    attendanceRate: pct(attendedTotal, attendanceSlots),
    submissionRate: pct(submittedTotal, submissionSlots),
    avgProgress,
    toGrade,
    labsToReview,
    upcoming,
    atRisk: rows.filter((r) => r.atRisk.length > 0),
  };
}

// ---------------------------------------------------------------------------
// Students and waitlist (admin only)

export function allStudents() {
  const s = db();
  return s.profiles
    .filter((p) => p.role === "student")
    .map((profile) => {
      const cohorts = s.cohortMembers
        .filter((m) => m.userId === profile.id && m.role === "student")
        .map((m) => cohortById(m.cohortId)!)
        .sort((a, b) => b.startsOn.getTime() - a.startsOn.getTime());
      const latest = cohorts[0];
      return { profile, cohorts, progress: latest ? progressFor(profile.id, latest).percent : null };
    })
    .sort((a, b) => a.profile.fullName.localeCompare(b.profile.fullName));
}

export function waitlistRows() {
  const s = db();
  return [...s.waitlist]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((w) => ({ ...w, programme: programmeById(w.programmeId)! }));
}

// ---------------------------------------------------------------------------
// Projects

export interface ProjectView {
  project: Project;
  members: Profile[];
  milestones: Milestone[];
  progress: number;
}

function projectView(project: Project): ProjectView {
  const s = db();
  const milestones = s.milestones.filter((m) => m.projectId === project.id).sort((a, b) => a.position - b.position);
  return {
    project,
    members: s.projectMembers.filter((m) => m.projectId === project.id).map((m) => profileById(m.userId)!),
    milestones,
    progress: pct(milestones.filter((m) => m.doneAt).length, milestones.length) ?? 0,
  };
}

export function cohortProjects(cohortId: string): ProjectView[] {
  return db()
    .projects.filter((p) => p.cohortId === cohortId)
    .map(projectView);
}

export function projectForUser(userId: string, cohortId: string): ProjectView | undefined {
  const s = db();
  const ids = new Set(s.projectMembers.filter((m) => m.userId === userId).map((m) => m.projectId));
  const project = s.projects.find((p) => p.cohortId === cohortId && ids.has(p.id));
  return project && projectView(project);
}

export function unassignedStudents(cohortId: string): Profile[] {
  const s = db();
  const projectIds = new Set(s.projects.filter((p) => p.cohortId === cohortId).map((p) => p.id));
  const assigned = new Set(s.projectMembers.filter((m) => projectIds.has(m.projectId)).map((m) => m.userId));
  return cohortRoster(cohortId).students.filter((p) => !assigned.has(p.id));
}

// ---------------------------------------------------------------------------
// Certificates

export function certificateById(id: string): Certificate | undefined {
  return db().certificates.find((c) => c.id === id);
}

export function certificateFor(userId: string, cohortId: string): Certificate | undefined {
  return db().certificates.find((c) => c.userId === userId && c.cohortId === cohortId);
}

/** Public details for /verify/[id]. Mirrors verify_certificate() in SQL. */
export function verifyCertificate(id: string) {
  const cert = certificateById(id);
  if (!cert) return undefined;
  const cohort = cohortById(cert.cohortId)!;
  return {
    cert,
    name: profileById(cert.userId)!.fullName,
    programme: programmeById(cohort.programmeId)!.title,
    cohort,
  };
}

export function cohortCertificates(cohortId: string) {
  const cohort = cohortById(cohortId)!;
  return cohortRoster(cohortId).students.map((profile) => ({
    profile,
    progress: progressFor(profile.id, cohort).percent,
    certificate: certificateFor(profile.id, cohortId),
  }));
}

/** Next certificate id for a programme and year, e.g. ACM-DEV-2026-00003. */
export function nextCertificateId(certCode: string, year: number): string {
  const prefix = `ACM-${certCode}-${year}-`;
  const max = db()
    .certificates.filter((c) => c.id.startsWith(prefix))
    .reduce((n, c) => Math.max(n, Number(c.id.slice(prefix.length))), 0);
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

export function submissionsFor(assignmentId: string) {
  return db().submissions.filter((s) => s.assignmentId === assignmentId);
}

/** Every student x lab status for a cohort, plus the queue of submitted labs. */
export function labBoard(cohortId: string) {
  const labs = cohortLabs(cohortId);
  const students = cohortRoster(cohortId).students;
  const queue = labs.flatMap((lab) =>
    students.filter((p) => labStatus(p.id, lab.id) === "submitted").map((profile) => ({ lab, profile })),
  );
  return { labs, students, queue };
}

export function attendanceFor(classId: string) {
  return db().attendance.filter((a) => a.classId === classId);
}

/** Latest posts in the given spaces, with reply counts, for the moderation queue. */
export function recentPostsIn(spaceIds: Set<string>, limit = 40) {
  const s = db();
  return s.posts
    .filter((p) => spaceIds.has(p.spaceId))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map((post) => ({
      post,
      author: profileById(post.authorId)!,
      space: s.spaces.find((sp) => sp.id === post.spaceId)!,
      replies: s.comments.filter((c) => c.postId === post.id).length,
    }));
}

export function allSpaces() {
  return db().spaces;
}
