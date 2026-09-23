import Link from "next/link";
import { Pill } from "@/components/ui";
import { cohortAssignments, cohortRoster, submissionFor } from "@/lib/data/repo";
import { assignmentState, STATE_META } from "@/lib/assignment-status";
import { formatShortDate, formatTime } from "@/lib/time";
import { loadCohort } from "../load";

export default async function Assignments({ params }: PageProps<"/cohorts/[cohortId]/assignments">) {
  const { user, cohort, role } = await loadCohort(params);
  const now = new Date();
  const { students } = cohortRoster(cohort.id);

  return (
    <ol className="divide-y divide-line rounded-md border border-line bg-surface">
      {cohortAssignments(cohort.id).map((a, i) => {
        const sub = submissionFor(user.id, a.id);
        const state = assignmentState(a, sub, now);
        const submitted = students.filter((s) => submissionFor(s.id, a.id)).length;
        return (
          <li key={a.id}>
            <Link
              href={`/cohorts/${cohort.id}/assignments/${a.id}`}
              className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4 hover:bg-paper"
            >
              <span className="w-8 font-mono text-xs font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 font-medium">{a.title}</span>
              <span className="font-mono text-xs text-muted">
                Due {formatShortDate(a.dueAt)} · {formatTime(a.dueAt)}
              </span>
              {role === "student" ? (
                <Pill tone={STATE_META[state].tone}>
                  {state === "graded" ? `${sub!.grade}/100` : STATE_META[state].label}
                </Pill>
              ) : (
                <Pill>
                  {submitted}/{students.length} in
                </Pill>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
