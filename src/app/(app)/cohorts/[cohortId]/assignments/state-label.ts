import type { AssignmentState } from "@/lib/assignment-status";
import type { Key } from "@/lib/i18n/translate";

/** STATE_META's status labels, as message keys for the reader's language. */
export const STATE_LABEL: Record<AssignmentState, Key> = {
  graded: "assignments.stateGraded",
  submitted: "assignments.stateSubmitted",
  late: "assignments.stateLate",
  overdue: "assignments.stateNotSubmitted",
  open: "assignments.stateNotSubmitted",
};
