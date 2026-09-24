import Link from "next/link";
import { Pill } from "@/components/ui";
import { cohortAssignments, cohortRoster } from "@/lib/data/repo";
import { submissionsFor } from "@/lib/data/admin";
import { requireCohortManager } from "@/lib/authz";
import { formatShortDate } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";

export default async function Grading({ params }: PageProps<"/admin/cohorts/[cohortId]/grading">) {
  const { t } = await getI18n();
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  const now = new Date();
  const total = cohortRoster(cohortId).students.length;
  const assignments = cohortAssignments(cohortId);

  if (assignments.length === 0) {
    return <p className="text-muted">{t("grading.noAssignments")}</p>;
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
              <span className="font-mono text-xs text-muted">
                {t("grading.due", { date: formatShortDate(a.dueAt) })}
              </span>
              <span className="w-28 font-mono text-xs">{t("grading.submittedOf", { count: subs.length, total })}</span>
              {toGrade > 0 ? (
                <Pill tone="accent">{t("grading.toGrade", { count: toGrade })}</Pill>
              ) : subs.length > 0 ? (
                <Pill tone="good">{t("grading.allGraded")}</Pill>
              ) : (
                <Pill>{a.dueAt > now ? t("grading.open") : t("grading.noneIn")}</Pill>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
