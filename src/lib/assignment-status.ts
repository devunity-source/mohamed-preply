import type { Assignment, Submission } from "@/lib/types";

export type AssignmentState = "graded" | "submitted" | "late" | "overdue" | "open";

export function assignmentState(a: Assignment, sub: Submission | undefined, now: Date): AssignmentState {
  if (sub?.grade != null) return "graded";
  if (sub) return sub.submittedAt > a.dueAt ? "late" : "submitted";
  return a.dueAt < now ? "overdue" : "open";
}

export const STATE_META: Record<
  AssignmentState,
  { label: string; tone: "neutral" | "accent" | "good" | "warn" | "bad" }
> = {
  graded: { label: "Graded", tone: "good" },
  submitted: { label: "Submitted", tone: "accent" },
  late: { label: "Late", tone: "warn" },
  overdue: { label: "Not submitted", tone: "bad" },
  open: { label: "Not submitted", tone: "neutral" },
};
