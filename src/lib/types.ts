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
}

export interface Programme {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  durationWeeks: number;
  priceCents: number;
  currency: "EUR";
  includes: string[];
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
