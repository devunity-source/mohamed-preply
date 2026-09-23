import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { Avatar, Button, Card, Empty, Pill } from "@/components/ui";
import { GradeForm } from "@/components/admin-forms";
import { cohortAssignments, cohortRoster, profileById, submissionFor } from "@/lib/data/repo";
import { gradeSubmission, remindNonSubmitters } from "@/lib/admin-actions";
import { assignmentState, STATE_META } from "@/lib/assignment-status";
import { requireCohortManager } from "@/lib/authz";
import { formatFull, timeAgo } from "@/lib/time";

export default async function GradeAssignment({
  params,
}: PageProps<"/admin/cohorts/[cohortId]/grading/[assignmentId]">) {
  const { cohortId, assignmentId } = await params;
  await requireCohortManager(cohortId);
  const a = cohortAssignments(cohortId).find((x) => x.id === assignmentId);
  if (!a) notFound();

  const now = new Date();
  const students = cohortRoster(cohortId).students;
  const rows = students
    .map((p) => ({ p, sub: submissionFor(p.id, a.id) }))
    // Ungraded submissions first, then graded, then missing.
    .sort((x, y) => rank(x.sub) - rank(y.sub));
  const missing = rows.filter((r) => !r.sub);

  return (
    <>
      <Link
        href={`/admin/cohorts/${cohortId}/grading`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> All assignments
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{a.title}</h2>
          <p className="mt-1 font-mono text-sm text-muted">Due {formatFull(a.dueAt)}</p>
        </div>
        {missing.length > 0 && (
          <form action={remindNonSubmitters.bind(null, a.id)}>
            <Button variant="ghost">
              <Bell size={14} /> Remind {missing.length} who haven&apos;t submitted
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-4">
        {rows.map(({ p, sub }) => {
          const state = assignmentState(a, sub, now);
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar profile={p} size={30} />
                <span className="flex-1 font-medium">{p.fullName}</span>
                {sub && <span className="font-mono text-xs text-muted">{timeAgo(sub.submittedAt, now)}</span>}
                <Pill tone={STATE_META[state].tone}>
                  {state === "graded" ? `${sub!.grade}/100` : STATE_META[state].label}
                </Pill>
              </div>
              {sub ? (
                <div className="mt-4 space-y-4 border-t border-line pt-4">
                  <a
                    href={sub.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate font-mono text-sm underline hover:text-accent"
                  >
                    {sub.repoUrl}
                  </a>
                  {sub.note && <p className="rounded-md bg-paper p-3 text-sm">“{sub.note}”</p>}
                  <GradeForm
                    action={gradeSubmission}
                    submissionId={sub.id}
                    rubric={a.rubric}
                    scores={sub.rubricScores}
                    feedback={sub.feedback}
                  />
                  {sub.gradedBy && sub.gradedAt && (
                    <p className="text-xs text-muted">
                      Last graded by {profileById(sub.gradedBy)?.fullName} {timeAgo(sub.gradedAt, now)}
                      {!sub.rubricScores && " (before rubrics; re-grade to record scores)"}
                    </p>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
        {rows.length === 0 && <Empty>No students in this cohort.</Empty>}
      </div>
    </>
  );
}

function rank(sub: { grade: number | null } | undefined) {
  if (!sub) return 2;
  return sub.grade == null ? 0 : 1;
}
