import { notFound } from "next/navigation";
import { Avatar, ButtonLink, Card, Label, Pill } from "@/components/ui";
import { ResourceList } from "@/components/resource-list";
import { SubmitAssignment } from "@/components/submit-assignment";
import { cohortAssignments, cohortRoster, resourcesByIds, submissionFor } from "@/lib/data/repo";
import { assignmentState, STATE_META } from "@/lib/assignment-status";
import { formatFull, relativeDay, timeAgo } from "@/lib/time";
import type { Assignment } from "@/lib/types";
import { loadCohort } from "../../load";

export default async function AssignmentPage({ params }: PageProps<"/cohorts/[cohortId]/assignments/[assignmentId]">) {
  const { assignmentId } = await params;
  const { user, cohort, role } = await loadCohort(params);
  const a = cohortAssignments(cohort.id).find((x) => x.id === assignmentId);
  if (!a) notFound();

  const now = new Date();
  const sub = submissionFor(user.id, a.id);
  const state = assignmentState(a, sub, now);
  const resources = resourcesByIds(a.resourceIds);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
      <div className="space-y-5 lg:col-span-2">
        <div>
          <Label className="mb-1">Assignment</Label>
          <h2 className="text-2xl font-semibold tracking-tight">{a.title}</h2>
          <p className="mt-2 font-mono text-sm text-muted">
            Due {formatFull(a.dueAt)}
            {a.dueAt > now && ` · ${relativeDay(a.dueAt, now)}`}
          </p>
        </div>

        <Card title="Instructions">
          <p className="leading-relaxed">{a.instructions}</p>
        </Card>

        {role === "student" ? (
          <Card title="Your submission" action={<Pill tone={STATE_META[state].tone}>{STATE_META[state].label}</Pill>}>
            {sub?.grade != null ? (
              <div className="space-y-4">
                <p className="text-5xl font-semibold tracking-tight">
                  {sub.grade}
                  <span className="text-xl text-muted">/100</span>
                </p>
                {sub.feedback && <p className="rounded-md bg-paper p-4 text-sm leading-relaxed">{sub.feedback}</p>}
                <a
                  href={sub.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-mono text-sm underline"
                >
                  {sub.repoUrl}
                </a>
              </div>
            ) : (
              <>
                {sub && (
                  <p className="mb-4 text-sm text-muted">
                    Submitted {timeAgo(sub.submittedAt, now)}. You can update it until it&apos;s graded.
                  </p>
                )}
                <SubmitAssignment assignmentId={a.id} defaultRepo={sub?.repoUrl} resubmit={!!sub} />
              </>
            )}
          </Card>
        ) : (
          <InstructorRoster cohortId={cohort.id} assignment={a} now={now} />
        )}
      </div>

      <div className="space-y-5">
        <Card title="Resources">
          <ResourceList resources={resources} />
        </Card>
      </div>
    </div>
  );
}

function InstructorRoster({ cohortId, assignment, now }: { cohortId: string; assignment: Assignment; now: Date }) {
  const { students } = cohortRoster(cohortId);
  return (
    <Card title="Submissions">
      <ul className="divide-y divide-line">
        {students.map((s) => {
          const sub = submissionFor(s.id, assignment.id);
          const state = assignmentState(assignment, sub, now);
          return (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <Avatar profile={s} size={28} />
              <span className="flex-1 text-sm font-medium">{s.fullName}</span>
              {sub && (
                <a
                  href={sub.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden font-mono text-xs text-muted underline sm:inline"
                >
                  repo
                </a>
              )}
              <Pill tone={STATE_META[state].tone}>
                {state === "graded" ? `${sub!.grade}/100` : STATE_META[state].label}
              </Pill>
            </li>
          );
        })}
      </ul>
      <ButtonLink href={`/admin/cohorts/${cohortId}/grading/${assignment.id}`} variant="ghost" className="mt-4">
        Open in grading
      </ButtonLink>
    </Card>
  );
}
