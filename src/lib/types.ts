// Domain types. These mirror the tables in supabase/migrations/0001_init.sql
// (camelCase here, snake_case in SQL) so the demo store and the future
// Supabase repository can share one shape.

export type Role = "student" | "instructor" | "admin";

export interface Profile {
  id: string;
  fullName: string;
  handle: string;
  role: Role;
  headline: string;
  avatarColor: string;
  /** Set when the first-visit welcome is dismissed. */
  onboardedAt?: Date | null;
}

export interface Programme {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  durationWeeks: number;
  priceCents: number;
  currency: "USD";
  includes: string[];
  // Used in certificate IDs, e.g. ACM-DEV-2026-00001.
  certCode: string;
  published: boolean;
}

export interface Module {
  id: string;
  programmeId: string;
  week: number;
  position: number;
  title: string;
  summary: string;
}

export type LessonKind = "reading" | "video" | "exercise";

export interface Lesson {
  id: string;
  moduleId: string;
  position: number;
  title: string;
  kind: LessonKind;
  durationMin: number;
  body: string;
}

export type CohortStatus = "upcoming" | "active" | "completed";

export interface Cohort {
  id: string;
  programmeId: string;
  code: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
  status: CohortStatus;
}

export interface CohortMember {
  cohortId: string;
  userId: string;
  role: "student" | "instructor";
}

export type MeetingProvider = "zoom" | "google_meet" | "livekit";

export interface Resource {
  id: string;
  cohortId: string | null;
  moduleId: string | null;
  kind: "slides" | "recording" | "cheatsheet" | "template" | "lab";
  title: string;
  url: string;
}

export interface ClassSession {
  id: string;
  cohortId: string;
  moduleId: string;
  title: string;
  description: string;
  startsAt: Date;
  durationMin: number;
  instructorId: string;
  provider: MeetingProvider;
  meetingUrl: string;
  recordingUrl: string | null;
}

export interface Attendance {
  classId: string;
  userId: string;
  status: "present" | "late" | "absent";
}

export interface Lab {
  id: string;
  cohortId: string;
  moduleId: string;
  number: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estMinutes: number;
  objectives: string[];
  dueAt: Date;
}

export type LabStatus = "not_started" | "in_progress" | "submitted" | "passed";

export interface LabAttempt {
  labId: string;
  userId: string;
  status: LabStatus;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  cohortId: string;
  moduleId: string;
  title: string;
  instructions: string;
  dueAt: Date;
  resourceIds: string[];
  rubric: RubricCriterion[];
}

export interface RubricCriterion {
  id: string;
  label: string;
  points: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  repoUrl: string;
  note: string;
  submittedAt: Date;
  grade: number | null;
  feedback: string | null;
  // Points per rubric criterion id, set when graded with a rubric.
  rubricScores: Record<string, number> | null;
  gradedBy: string | null;
  gradedAt: Date | null;
}

export type CalendarKind = "class" | "lab" | "office_hours" | "workshop" | "deadline" | "event";

// Standalone events (office hours, workshops, campus events). Classes and
// deadlines are projected onto the calendar from their own tables.
export interface CampusEvent {
  id: string;
  cohortId: string | null;
  kind: Exclude<CalendarKind, "class" | "deadline">;
  title: string;
  startsAt: Date;
  durationMin: number;
  hostId: string | null;
}

export interface Space {
  id: string;
  slug: string;
  name: string;
  group: string;
  description: string;
  cohortId: string | null;
  // Only instructors/admins may post (e.g. Announcements).
  readOnly: boolean;
}

export interface Post {
  id: string;
  spaceId: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: Date;
  pinned: boolean;
  // Locked threads accept no new replies.
  locked: boolean;
}

/**
 * A weekly window when students can message their cohort's instructors.
 * Wall-clock times in the academy timezone; end is exclusive.
 */
export interface OfficeHoursSlot {
  cohortId: string;
  weekday: number; // 0 = Monday ... 6 = Sunday
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

/** One conversation per student per cohort, between the student and the cohort's instructors. */
export interface OfficeThread {
  id: string;
  cohortId: string;
  studentId: string;
  createdAt: Date;
  lastMessageAt: Date;
  instructorReadAt: Date | null;
  studentReadAt: Date | null;
}

export interface OfficeMessage {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

/** When someone last opened a community space. Drives the per-space unread counts. */
export interface SpaceRead {
  userId: string;
  spaceId: string;
  lastSeenAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

export interface Reaction {
  postId: string;
  userId: string;
  emoji: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  href: string;
  createdAt: Date;
  readAt: Date | null;
}

export interface Project {
  id: string;
  cohortId: string;
  title: string;
  teamName: string;
  brief: string;
  repoUrl: string | null;
  presentsAt: Date | null;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  position: number;
  title: string;
  dueOn: Date;
  doneAt: Date | null;
}

export interface Certificate {
  // Public, e.g. ACM-DEV-2026-00001.
  id: string;
  userId: string;
  cohortId: string;
  issuedAt: Date;
  issuedBy: string;
  revokedAt: Date | null;
}

// Sign-in credentials, kept apart from Profile so hashes and emails never ride
// along when profiles are rendered for other users.
export interface Account {
  userId: string;
  email: string;
  // scrypt hash; null means the account can't sign in with a password.
  passwordHash: string | null;
  /** Set when an admin created the account with a temporary password. */
  mustChangePassword?: boolean;
}

export interface Session {
  // SHA-256 of the cookie token. The raw token only ever lives in the cookie.
  tokenHash: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  programmeId: string;
  createdAt: Date;
}

export interface LessonProgress {
  userId: string;
  lessonId: string;
  completedAt: Date;
}
