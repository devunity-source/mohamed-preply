import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { ButtonLink, Card, Label, PageHeader, Pill } from "@/components/ui";
import { cohortStats, waitlistRows } from "@/lib/data/admin";
import { cohortWeek } from "@/lib/data/repo";
import { isAdmin, managedCohortIds, requireAdminArea } from "@/lib/authz";
import { formatMoney, formatPercent } from "@/lib/format";
import { formatShortDate } from "@/lib/time";

export default async function AdminOverview() {
  const user = await requireAdminArea();
  const now = new Date();
  const stats = managedCohortIds(user).map((id) => cohortStats(id, now));
  const active = stats.filter((s) => s.cohort.status === "active");
  const admin = isAdmin(user);

  const kpis = [
    { label: "Active cohorts", value: String(active.length) },
    { label: "Students (active)", value: String(active.reduce((n, s) => n + s.students.length, 0)) },
    { label: "To grade", value: String(stats.reduce((n, s) => n + s.toGrade + s.labsToReview, 0)) },
    ...(admin
      ? [
          {
            label: "Revenue, active (est.)",
            value: formatMoney(active.reduce((n, s) => n + s.estimatedRevenueCents, 0)),
          },
          { label: "Waitlist", value: String(waitlistRows().length) },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader eyebrow={admin ? "Overview" : "Your cohorts"} title={admin ? "Running the academy" : "Teaching"}>
        {admin && (
          <ButtonLink href="/admin/cohorts/new">
            <Plus size={16} /> New cohort
          </ButtonLink>
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
      {admin && (
        <p className="-mt-7 mb-10 text-xs text-muted">
          Revenue is estimated as enrolled students × list price until Stripe is connected.
        </p>
      )}

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
                  {s.programme.title} · Cohort {s.cohort.code}
                </Label>
                <Pill tone={s.cohort.status === "active" ? "good" : "quiet"}>
                  {s.cohort.status === "active" ? `Week ${week}/${totalWeeks}` : s.cohort.status}
                </Pill>
              </div>
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight group-hover:text-accent">
                {s.cohort.name} <ArrowUpRight size={16} />
              </h2>
              <p className="mt-1 text-sm text-muted">
                {formatShortDate(s.cohort.startsOn)} to {formatShortDate(s.cohort.endsOn)} · {s.students.length}{" "}
                students
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Attendance", formatPercent(s.attendanceRate)],
                  ["Submitted", formatPercent(s.submissionRate)],
                  ["Avg progress", `${s.avgProgress}%`],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-md border border-line p-2">
                    <dt className="text-[11px] text-muted">{l}</dt>
                    <dd className="font-mono text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {s.atRisk.length > 0 && (
                <p className="mt-4 text-sm text-k-deadline">
                  {s.atRisk.length} student{s.atRisk.length > 1 ? "s" : ""} need attention
                </p>
              )}
            </Link>
          );
        })}
      </div>
      {stats.length === 0 && <Card>No cohorts yet.</Card>}
    </>
  );
}
