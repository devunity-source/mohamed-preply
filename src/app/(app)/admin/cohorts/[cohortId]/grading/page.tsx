import Link from "next/link";
import { Pill } from "@/components/ui";
import { cohortAssignments, cohortRoster } from "@/lib/data/repo";
import { submissionsFor } from "@/lib/data/admin";
import { requireCohortManager } from "@/lib/authz";
import { formatShortDate } from "@/lib/time";

export default async function Grading({ params }: PageProps<"/admin/cohorts/[cohortId]/grading">) {
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  const now = new Date();
  const total = cohortRoster(cohortId).students.length;
  const assignments = cohortAssignments(cohortId);

  if (assignments.length === 0) {
    return <p className="text-muted">This cohort has no assignments.</p>;
  }

  return (
    <ol className="divide-y divide-line rounded-md border border-line bg-surface">
      {assignments.map((a) => {
        const subs = submissionsFor(a.id);
        const toGrade = subs.filter((s) => s.grade == null).length;
        return (
          <li key={a.id}>
            <Link
              href={`/admin/cohorts/${cohortId}/grading/${a.id}`}
              className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4 hover:bg-paper"
            >
              <span className="flex-1 font-medium">{a.title}</span>
              <span className="font-mono text-xs text-muted">Due {formatShortDate(a.dueAt)}</span>
              <span className="w-28 font-mono text-xs">
                {subs.length}/{total} submitted
              </span>
              {toGrade > 0 ? (
                <Pill tone="accent">{toGrade} to grade</Pill>
              ) : subs.length > 0 ? (
                <Pill tone="good">All graded</Pill>
              ) : (
                <Pill>{a.dueAt > now ? "Open" : "None in"}</Pill>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
