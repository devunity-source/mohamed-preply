import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, Bell, Check, ExternalLink } from "lucide-react";
import { Avatar, ButtonLink, Card, Empty, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { GradeForm } from "@/components/admin-forms";
import { GradingKeys } from "@/components/grading-keys";
import { cohortAssignments, cohortRoster, profileById, submissionFor } from "@/lib/data/repo";
import { gradeSubmission, remindNonSubmitters } from "@/lib/admin-actions";
import { assignmentState, STATE_META } from "@/lib/assignment-status";
import { requireCohortManager } from "@/lib/authz";
import { formatFull, timeAgo } from "@/lib/time";

export default async function GradeAssignment({
  params,
  searchParams,
}: PageProps<"/admin/cohorts/[cohortId]/grading/[assignmentId]">) {
  const { cohortId, assignmentId } = await params;
  const { student, graded } = await searchParams;
  await requireCohortManager(cohortId);
  const a = cohortAssignments(cohortId).find((x) => x.id === assignmentId);
  if (!a) notFound();

  const now = new Date();
  const all = cohortRoster(cohortId).students.map((p) => ({ p, sub: submissionFor(p.id, a.id) }));
  // The queue: ungraded first (oldest submission first), then graded.
  const queue = all
    .flatMap(({ p, sub }) => (sub ? [{ p, sub }] : []))
    .sort(
      (x, y) =>
        Number(x.sub.grade != null) - Number(y.sub.grade != null) ||
        x.sub.submittedAt.getTime() - y.sub.submittedAt.getTime(),
    );
  const missing = all.filter((r) => !r.sub).map((r) => r.p);
  const ungraded = queue.filter((r) => r.sub.grade == null);

  const index = Math.max(
    0,
    queue.findIndex((r) => r.p.id === student),
  );
  const current = queue[index];
  const href = (id: string) => `?student=${id}`;
  const nextUngraded = ungraded.find((r) => r.p.id !== current?.p.id);
  // Set by "Save and next": confirm the save that just happened on the previous student.
  const justGraded = queue.find((r) => r.p.id === graded && r.sub.grade != null);

  return (
    <>
      <Link
        href={`/admin/cohorts/${cohortId}/grading`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> All assignments
      </Link>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">{a.title}</h2>
        <p className="mt-1 text-sm text-muted">
          Due {formatFull(a.dueAt)} · {ungraded.length === 0 ? "all graded" : `${ungraded.length} to grade`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[17rem_1fr] [&>*]:min-w-0">
        <div className="space-y-5 lg:order-none">
          <Card title={`Submissions · ${queue.length}`}>
            {queue.length ? (
              <ul className="-mx-2">
                {queue.map(({ p, sub }) => {
                  const state = assignmentState(a, sub, now);
                  const active = p.id === current?.p.id;
                  return (
                    <li key={p.id}>
                      <Link
                        href={href(p.id)}
                        scroll={false}
                        aria-current={active ? "true" : undefined}
                        className={clsx(
                          "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm",
                          active ? "bg-ink text-paper" : "hover:bg-line/60",
                        )}
                      >
                        <Avatar profile={p} size={24} />
                        <span className="min-w-0 flex-1 truncate">{p.fullName}</span>
                        {state === "graded" ? (
                          <span className="font-mono text-xs opacity-70">{sub.grade}</span>
                        ) : (
                          <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="Needs grading" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty>Nothing submitted yet.</Empty>
            )}
          </Card>

          {missing.length > 0 && (
            <Card title={`Not submitted · ${missing.length}`}>
              <ul className="mb-4 space-y-1.5 text-sm text-muted">
                {missing.map((p) => (
                  <li key={p.id}>{p.fullName}</li>
                ))}
              </ul>
              <form action={remindNonSubmitters.bind(null, a.id)}>
                <SubmitButton variant="ghost" className="w-full">
                  <Bell size={14} /> Send a reminder
                </SubmitButton>
              </form>
            </Card>
          )}
        </div>

        {current ? (
          <div className="space-y-3">
            {justGraded && (
              <p role="status" className="flex items-center gap-2 text-sm text-k-office">
                <Check size={14} strokeWidth={3} /> Saved {justGraded.p.fullName}&apos;s grade ({justGraded.sub.grade}
                /100). They&apos;ve been notified.
              </p>
            )}
            <Card>
              <GradingKeys
                prev={index > 0 ? href(queue[index - 1].p.id) : undefined}
                next={index < queue.length - 1 ? href(queue[index + 1].p.id) : undefined}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Avatar profile={current.p} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{current.p.fullName}</p>
                  <p className="text-xs text-muted">
                    Submitted {timeAgo(current.sub.submittedAt, now)} · {index + 1} of {queue.length}
                  </p>
                </div>
                <Pill tone={STATE_META[assignmentState(a, current.sub, now)].tone}>
                  {current.sub.grade != null
                    ? `${current.sub.grade}/100`
                    : STATE_META[assignmentState(a, current.sub, now)].label}
                </Pill>
              </div>

              <div className="mt-5 space-y-4 border-t border-line pt-5">
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonLink href={current.sub.repoUrl} external variant="ghost">
                    <ExternalLink size={14} /> Open repo
                  </ButtonLink>
                  <span className="min-w-0 truncate font-mono text-xs text-muted">{current.sub.repoUrl}</span>
                </div>
                {current.sub.note && <p className="rounded-md bg-paper p-3 text-sm">“{current.sub.note}”</p>}
                <GradeForm
                  key={current.sub.id}
                  action={gradeSubmission}
                  submissionId={current.sub.id}
                  rubric={a.rubric}
                  scores={current.sub.rubricScores}
                  feedback={current.sub.feedback}
                  nextStudentId={current.sub.grade == null ? nextUngraded?.p.id : undefined}
                />
                {current.sub.gradedBy && current.sub.gradedAt && (
                  <p className="text-xs text-muted">
                    Last graded by {profileById(current.sub.gradedBy)?.fullName} {timeAgo(current.sub.gradedAt, now)}
                    {!current.sub.rubricScores && " (before rubrics; re-grade to record scores)"}
                  </p>
                )}
                <p className="hidden text-xs text-muted md:block">
                  <Kbd>j</Kbd> / <Kbd>k</Kbd> next and previous · <Kbd>⌘</Kbd>/<Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> save
                </p>
              </div>
            </Card>
          </div>
        ) : (
          <Empty>No submissions to grade yet.</Empty>
        )}
      </div>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-[4px] border border-line px-1 font-mono text-[11px]">{children}</kbd>;
}
