import { notFound } from "next/navigation";
import { Avatar, ButtonLink, Card, Label, Pill } from "@/components/ui";
import { ResourceList } from "@/components/resource-list";
import { SubmitAssignment } from "@/components/submit-assignment";
import { cohortAssignments, cohortRoster, resourcesByIds, submissionFor } from "@/lib/data/repo";
import { assignmentState, STATE_META } from "@/lib/assignment-status";
import { formatFull, relativeDay, timeAgo } from "@/lib/time";
import type { Assignment } from "@/lib/types";
import { getI18n } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/translate";
import { loadCohort } from "../../load";
import { STATE_LABEL } from "../state-label";

export default async function AssignmentPage({ params }: PageProps<"/cohorts/[cohortId]/assignments/[assignmentId]">) {
  const { t } = await getI18n();
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
          <Label className="mb-1">{t("assignments.assignment")}</Label>
          <h2 className="text-2xl font-semibold tracking-tight">{a.title}</h2>
          <p className="mt-2 font-mono text-sm text-muted">
            {t("assignments.dueFull", { when: formatFull(a.dueAt) })}
            {a.dueAt > now && ` · ${relativeDay(a.dueAt, now)}`}
          </p>
        </div>

        <Card title={t("assignments.instructions")}>
          <p className="leading-relaxed">{a.instructions}</p>
        </Card>

        {role === "student" ? (
          <Card
            title={t("assignments.yourSubmission")}
            action={<Pill tone={STATE_META[state].tone}>{t(STATE_LABEL[state])}</Pill>}
          >
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
                  dir="ltr"
                  className="block truncate text-start font-mono text-sm underline"
                >
                  {sub.repoUrl}
                </a>
              </div>
            ) : (
              <>
                {sub && (
                  <p className="mb-4 text-sm text-muted">
                    {t("assignments.submittedAgo", { ago: timeAgo(sub.submittedAt, now) })}
                  </p>
                )}
                <SubmitAssignment assignmentId={a.id} defaultRepo={sub?.repoUrl} resubmit={!!sub} />
              </>
            )}
          </Card>
        ) : (
          <InstructorRoster cohortId={cohort.id} assignment={a} now={now} t={t} />
        )}
      </div>

      <div className="space-y-5">
        <Card title={t("assignments.resources")}>
          <ResourceList resources={resources} />
        </Card>
      </div>
    </div>
  );
}

function InstructorRoster({
  cohortId,
  assignment,
  now,
  t,
}: {
  cohortId: string;
  assignment: Assignment;
  now: Date;
  t: T;
}) {
  const { students } = cohortRoster(cohortId);
  return (
    <Card title={t("assignments.submissions")}>
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
                  {t("assignments.repo")}
                </a>
              )}
              <Pill tone={STATE_META[state].tone}>
                {state === "graded" ? `${sub!.grade}/100` : t(STATE_LABEL[state])}
              </Pill>
            </li>
          );
        })}
      </ul>
      <ButtonLink href={`/admin/cohorts/${cohortId}/grading/${assignment.id}`} variant="ghost" className="mt-4">
        {t("assignments.openInGrading")}
      </ButtonLink>
    </Card>
  );
}
