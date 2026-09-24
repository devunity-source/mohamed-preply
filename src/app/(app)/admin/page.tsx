import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { ButtonLink, Card, Label, PageHeader, Pill } from "@/components/ui";
import { cohortStats, waitlistRows } from "@/lib/data/admin";
import { cohortWeek } from "@/lib/data/repo";
import { isAdmin, managedCohortIds, requireAdminArea } from "@/lib/authz";
import { formatMoney, formatPercent } from "@/lib/format";
import { formatShortDate } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";

const STATUS = {
  upcoming: "admin.statusUpcoming",
  active: "admin.statusActive",
  completed: "admin.statusCompleted",
} as const;

export default async function AdminOverview() {
  const { t, locale } = await getI18n();
  const user = await requireAdminArea();
  const now = new Date();
  const stats = managedCohortIds(user).map((id) => cohortStats(id, now));
  const active = stats.filter((s) => s.cohort.status === "active");
  const admin = isAdmin(user);

  const kpis = [
    { label: t("admin.kpiActiveCohorts"), value: String(active.length) },
    {
      label: t("admin.kpiActiveStudents"),
      value: String(active.reduce((n, s) => n + s.students.length, 0)),
    },
    { label: t("admin.kpiToGrade"), value: String(stats.reduce((n, s) => n + s.toGrade + s.labsToReview, 0)) },
    ...(admin
      ? [
          {
            label: t("admin.kpiRevenue"),
            value: formatMoney(active.reduce((n, s) => n + s.estimatedRevenueCents, 0)),
          },
          { label: t("admin.kpiWaitlist"), value: String(waitlistRows().length) },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow={admin ? t("admin.overviewEyebrow") : t("admin.yourCohortsEyebrow")}
        title={admin ? t("admin.runningTitle") : t("admin.teachingTitle")}
      >
        {admin && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/programmes/new" variant="ghost">
              <Plus size={16} /> {t("admin.newProgramme")}
            </ButtonLink>
            <ButtonLink href="/admin/cohorts/new">
              <Plus size={16} /> {t("admin.newCohort")}
            </ButtonLink>
          </div>
        )}
      </PageHeader>

      <dl className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface p-5">
            <dt className="text-[13px] text-muted">{k.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">{k.value}</dd>
          </div>
        ))}
      </dl>
      {admin && <p className="-mt-7 mb-10 text-xs text-muted">{t("admin.revenueNote")}</p>}

      <div className="grid gap-5 md:grid-cols-2">
        {stats.map((s) => {
          const { week, totalWeeks } = cohortWeek(s.cohort, now);
          return (
            <Link
              key={s.cohort.id}
              href={`/admin/cohorts/${s.cohort.id}`}
              className="group rounded-md border border-line bg-surface p-6 transition-colors hover:border-ink"
            >
              <div className="mb-4 flex items-center justify-between">
                <Label>
                  {t("admin.cohortLabel", { programme: loc(s.programme, locale).title, code: s.cohort.code })}
                </Label>
                <Pill tone={s.cohort.status === "active" ? "good" : "quiet"}>
                  {s.cohort.status === "active"
                    ? t("admin.weekOf", { week, total: totalWeeks })
                    : t(STATUS[s.cohort.status])}
                </Pill>
              </div>
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight group-hover:text-accent">
                {s.cohort.name} <ArrowUpRight size={16} className="rtl:-scale-x-100" />
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t("admin.cohortDates", {
                  start: formatShortDate(s.cohort.startsOn),
                  end: formatShortDate(s.cohort.endsOn),
                  count: s.students.length,
                })}
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  [t("admin.attendance"), formatPercent(s.attendanceRate)],
                  [t("admin.submitted"), formatPercent(s.submissionRate)],
                  [t("admin.avgProgress"), `${s.avgProgress}%`],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-md border border-line p-2">
                    <dt className="text-[11px] text-muted">{l}</dt>
                    <dd className="font-mono text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {s.atRisk.length > 0 && (
                <p className="mt-4 text-sm text-k-deadline">{t("admin.needAttention", { count: s.atRisk.length })}</p>
              )}
            </Link>
          );
        })}
      </div>
      {stats.length === 0 && <Card>{t("admin.noCohorts")}</Card>}
    </>
  );
}
