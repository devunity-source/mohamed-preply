import Link from "next/link";
import { DoneGroup, Empty, Pill } from "@/components/ui";
import { cohortAssignments, cohortRoster, submissionFor } from "@/lib/data/repo";
import { assignmentState, STATE_META, type AssignmentState } from "@/lib/assignment-status";
import { formatShortDate, formatTime } from "@/lib/time";
import type { Assignment } from "@/lib/types";
import { getI18n } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/translate";
import { loadCohort } from "../load";
import { STATE_LABEL } from "./state-label";

const NEEDS_WORK: AssignmentState[] = ["overdue", "open"];

export default async function Assignments({ params }: PageProps<"/cohorts/[cohortId]/assignments">) {
  const { t } = await getI18n();
  const { user, cohort, role } = await loadCohort(params);
  const now = new Date();
  const { students } = cohortRoster(cohort.id);
  const student = role === "student";

  const rows = cohortAssignments(cohort.id).map((a, i) => {
    const sub = submissionFor(user.id, a.id);
    return { a, n: i + 1, sub, state: assignmentState(a, sub, now) };
  });
  // Students: overdue first, then what's due soonest. Handed-in work folds away.
  const open = student
    ? rows
        .filter((r) => NEEDS_WORK.includes(r.state))
        .sort((x, y) => Number(y.state === "overdue") - Number(x.state === "overdue"))
    : rows;
  const done = student ? rows.filter((r) => !NEEDS_WORK.includes(r.state)).reverse() : [];

  const row = (r: (typeof rows)[number]) => (
    <Row
      key={r.a.id}
      cohortId={cohort.id}
      a={r.a}
      n={r.n}
      t={t}
      badge={
        student ? (
          <Pill tone={STATE_META[r.state].tone}>
            {r.state === "graded" ? `${r.sub!.grade}/100` : t(STATE_LABEL[r.state])}
          </Pill>
        ) : (
          <Pill>
            {t("assignments.handedInCount", {
              done: students.filter((s) => submissionFor(s.id, r.a.id)).length,
              total: students.length,
            })}
          </Pill>
        )
      }
    />
  );

  return (
    <div className="space-y-5">
      {open.length === 0 ? (
        <Empty>{t("assignments.allHandedIn")}</Empty>
      ) : (
        <ol className="divide-y divide-line rounded-md border border-line bg-surface">{open.map(row)}</ol>
      )}
      <DoneGroup label={t("assignments.handedIn")} count={done.length}>
        <ol className="divide-y divide-line rounded-md border border-line bg-surface">{done.map(row)}</ol>
      </DoneGroup>
    </div>
  );
}

function Row({
  cohortId,
  a,
  n,
  t,
  badge,
}: {
  cohortId: string;
  a: Assignment;
  n: number;
  t: T;
  badge: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={`/cohorts/${cohortId}/assignments/${a.id}`}
        className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4 hover:bg-paper"
      >
        <span className="w-8 font-mono text-xs font-semibold text-muted">{String(n).padStart(2, "0")}</span>
        <span className="flex-1 font-medium">{a.title}</span>
        <span className="font-mono text-xs text-muted">
          {t("assignments.dueAt", { date: formatShortDate(a.dueAt), time: formatTime(a.dueAt) })}
        </span>
        {badge}
      </Link>
    </li>
  );
}
