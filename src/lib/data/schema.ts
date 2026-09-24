import "server-only";
import { wallTime, zonedParts } from "@/lib/time";
import type { Store } from "./seed";

// How each in-memory collection maps to a Supabase table: field names, the
// primary key, and values that need converting (timestamps, date-only
// columns, "HH:MM:SS" times). Used both to turn app_snapshot() into a Store
// and to turn writes on a Store into inserts, updates and deletes.

type Kind = "timestamp" | "date" | "time";

export interface TableMap {
  table: string;
  /** Primary key, as app field names. */
  key: string[];
  /** App field -> column. Only these fields are stored. */
  fields: Record<string, string>;
  kinds?: Record<string, Kind>;
  /** Stored as "" in the app but NULL-able in the database. */
  emptyAsNull?: string[];
}

const same = (...names: string[]) => Object.fromEntries(names.map((n) => [n, n]));

export const TABLES = {
  profiles: {
    table: "profiles",
    key: ["id"],
    fields: {
      ...same("id", "handle", "role", "headline"),
      fullName: "full_name",
      avatarColor: "avatar_color",
      onboardedAt: "onboarded_at",
    },
    kinds: { onboardedAt: "timestamp" },
  },
  programmes: {
    table: "programmes",
    key: ["id"],
    fields: {
      ...same("id", "slug", "title", "tagline", "description", "currency", "includes", "published"),
      durationWeeks: "duration_weeks",
      priceCents: "price_cents",
      certCode: "cert_code",
    },
  },
  modules: {
    table: "programme_modules",
    key: ["id"],
    fields: { ...same("id", "week", "position", "title", "summary"), programmeId: "programme_id" },
  },
  lessons: {
    table: "lessons",
    key: ["id"],
    fields: { ...same("id", "position", "title", "kind", "body"), moduleId: "module_id", durationMin: "duration_min" },
  },
  cohorts: {
    table: "cohorts",
    key: ["id"],
    fields: {
      ...same("id", "code", "name", "status"),
      programmeId: "programme_id",
      startsOn: "starts_on",
      endsOn: "ends_on",
    },
    kinds: { startsOn: "date", endsOn: "date" },
  },
  cohortMembers: {
    table: "cohort_members",
    key: ["cohortId", "userId"],
    fields: { role: "role", cohortId: "cohort_id", userId: "user_id" },
  },
  classes: {
    table: "classes",
    key: ["id"],
    fields: {
      ...same("id", "title", "description", "provider"),
      cohortId: "cohort_id",
      moduleId: "module_id",
      startsAt: "starts_at",
      durationMin: "duration_min",
      instructorId: "instructor_id",
      meetingUrl: "meeting_url",
      recordingUrl: "recording_url",
    },
    kinds: { startsAt: "timestamp" },
    emptyAsNull: ["meetingUrl"],
  },
  attendance: {
    table: "class_attendance",
    key: ["classId", "userId"],
    fields: { status: "status", classId: "class_id", userId: "user_id" },
  },
  labs: {
    table: "labs",
    key: ["id"],
    fields: {
      ...same("id", "number", "title", "difficulty", "objectives"),
      cohortId: "cohort_id",
      moduleId: "module_id",
      estMinutes: "est_minutes",
      dueAt: "due_at",
    },
    kinds: { dueAt: "timestamp" },
  },
  labAttempts: {
    table: "lab_attempts",
    key: ["labId", "userId"],
    fields: { status: "status", labId: "lab_id", userId: "user_id", updatedAt: "updated_at" },
    kinds: { updatedAt: "timestamp" },
  },
  assignments: {
    table: "assignments",
    key: ["id"],
    fields: {
      ...same("id", "title", "instructions", "rubric"),
      cohortId: "cohort_id",
      moduleId: "module_id",
      dueAt: "due_at",
    },
    kinds: { dueAt: "timestamp" },
  },
  submissions: {
    table: "assignment_submissions",
    key: ["id"],
    fields: {
      ...same("id", "note"),
      assignmentId: "assignment_id",
      userId: "user_id",
      repoUrl: "repo_url",
      submittedAt: "submitted_at",
    },
    kinds: { submittedAt: "timestamp" },
    emptyAsNull: ["repoUrl"],
  },
  resources: {
    table: "resources",
    key: ["id"],
    fields: { ...same("id", "kind", "title", "url"), cohortId: "cohort_id", moduleId: "module_id" },
  },
  events: {
    table: "events",
    key: ["id"],
    fields: {
      ...same("id", "kind", "title"),
      cohortId: "cohort_id",
      startsAt: "starts_at",
      durationMin: "duration_min",
      hostId: "host_id",
    },
    kinds: { startsAt: "timestamp" },
  },
  spaces: {
    table: "spaces",
    key: ["id"],
    fields: { ...same("id", "slug", "name", "group", "description"), cohortId: "cohort_id", readOnly: "read_only" },
  },
  posts: {
    table: "posts",
    key: ["id"],
    fields: {
      ...same("id", "title", "body", "pinned", "locked"),
      spaceId: "space_id",
      authorId: "author_id",
      createdAt: "created_at",
    },
    kinds: { createdAt: "timestamp" },
  },
  comments: {
    table: "comments",
    key: ["id"],
    fields: { ...same("id", "body"), postId: "post_id", authorId: "author_id", createdAt: "created_at" },
    kinds: { createdAt: "timestamp" },
  },
  reactions: {
    table: "reactions",
    key: ["postId", "userId", "emoji"],
    fields: { emoji: "emoji", postId: "post_id", userId: "user_id" },
  },
  notifications: {
    table: "notifications",
    key: ["id"],
    fields: { ...same("id", "text", "href"), userId: "user_id", createdAt: "created_at", readAt: "read_at" },
    kinds: { createdAt: "timestamp", readAt: "timestamp" },
  },
  lessonProgress: {
    table: "lesson_progress",
    key: ["userId", "lessonId"],
    fields: { userId: "user_id", lessonId: "lesson_id", completedAt: "completed_at" },
    kinds: { completedAt: "timestamp" },
  },
  waitlist: {
    table: "waitlist",
    key: ["id"],
    fields: { ...same("id", "email"), programmeId: "programme_id", createdAt: "created_at" },
    kinds: { createdAt: "timestamp" },
  },
  projects: {
    table: "projects",
    key: ["id"],
    fields: {
      ...same("id", "title", "brief"),
      cohortId: "cohort_id",
      teamName: "team_name",
      repoUrl: "repo_url",
      presentsAt: "presents_at",
    },
    kinds: { presentsAt: "timestamp" },
  },
  projectMembers: {
    table: "project_members",
    key: ["projectId", "userId"],
    fields: { projectId: "project_id", userId: "user_id" },
  },
  milestones: {
    table: "project_milestones",
    key: ["id"],
    fields: { ...same("id", "position", "title"), projectId: "project_id", dueOn: "due_on", doneAt: "done_at" },
    kinds: { dueOn: "timestamp", doneAt: "timestamp" },
  },
  certificates: {
    table: "certificates",
    key: ["id"],
    fields: {
      id: "id",
      userId: "user_id",
      cohortId: "cohort_id",
      issuedAt: "issued_at",
      issuedBy: "issued_by",
      revokedAt: "revoked_at",
    },
    kinds: { issuedAt: "timestamp", revokedAt: "timestamp" },
  },
  spaceReads: {
    table: "space_reads",
    key: ["userId", "spaceId"],
    fields: { userId: "user_id", spaceId: "space_id", lastSeenAt: "last_seen_at" },
    kinds: { lastSeenAt: "timestamp" },
  },
  officeHours: {
    table: "office_hours",
    key: ["cohortId", "weekday"],
    fields: { weekday: "weekday", cohortId: "cohort_id", start: "starts_at", end: "ends_at" },
    kinds: { start: "time", end: "time" },
  },
  officeThreads: {
    table: "office_threads",
    key: ["id"],
    fields: {
      id: "id",
      cohortId: "cohort_id",
      studentId: "student_id",
      createdAt: "created_at",
      lastMessageAt: "last_message_at",
      instructorReadAt: "instructor_read_at",
      studentReadAt: "student_read_at",
    },
    kinds: {
      createdAt: "timestamp",
      lastMessageAt: "timestamp",
      instructorReadAt: "timestamp",
      studentReadAt: "timestamp",
    },
  },
  officeMessages: {
    table: "office_messages",
    key: ["id"],
    fields: { ...same("id", "body"), threadId: "thread_id", authorId: "author_id", createdAt: "created_at" },
    kinds: { createdAt: "timestamp" },
  },
  emailPrefs: {
    table: "email_preferences",
    key: ["userId"],
    fields: { userId: "user_id", off: "off" },
  },
  remindersSent: {
    table: "email_reminders",
    key: ["classId", "userId"],
    fields: { classId: "class_id", userId: "user_id", sentAt: "sent_at" },
    kinds: { sentAt: "timestamp" },
  },
} satisfies Partial<Record<keyof Store, TableMap>>;

export type Persisted = keyof typeof TABLES;

/** Collections that only exist in demo mode (Supabase Auth replaces them). */
export const MEMORY_ONLY = ["accounts", "sessions"] as const;

type Row = Record<string, unknown>;

/** "2026-09-24" in the academy timezone, for date-only columns. */
function dateOnly(d: Date): string {
  const p = zonedParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function fromColumn(kind: Kind | undefined, v: unknown): unknown {
  if (v === null || v === undefined) return v ?? null;
  if (kind === "timestamp") return new Date(v as string);
  if (kind === "date") {
    const [y, m, d] = (v as string).split("-").map(Number);
    return wallTime(y, m, d);
  }
  if (kind === "time") return (v as string).slice(0, 5);
  return v;
}

function toColumn(kind: Kind | undefined, v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (kind === "timestamp") return (v as Date).toISOString();
  if (kind === "date") return dateOnly(v as Date);
  return v;
}

/** A database row as an app object. */
export function fromRow(map: TableMap, row: Row): Row {
  const out: Row = {};
  for (const [field, column] of Object.entries(map.fields)) {
    const v = fromColumn(map.kinds?.[field], row[column]);
    out[field] = v === null && map.emptyAsNull?.includes(field) ? "" : v;
  }
  if ("currency" in out && typeof out.currency === "string") out.currency = out.currency.trim();
  return out;
}

/** App fields as database columns. Fields the table doesn't store are dropped. */
export function toRow(map: TableMap, values: Row): Row {
  const out: Row = {};
  for (const [field, v] of Object.entries(values)) {
    const column = map.fields[field];
    if (!column) continue;
    out[column] = v === "" && map.emptyAsNull?.includes(field) ? null : toColumn(map.kinds?.[field], v);
  }
  return out;
}

/** The primary key of an app object, as database columns. */
export function keyOf(map: TableMap, obj: Row): Row {
  return Object.fromEntries(map.key.map((k) => [map.fields[k], toColumn(map.kinds?.[k], obj[k])]));
}
