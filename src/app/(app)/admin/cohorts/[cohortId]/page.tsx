import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { Avatar, Card, Empty, KindMark, ProgressBar } from "@/components/ui";
import { cohortStats } from "@/lib/data/admin";
import { cohortWeek } from "@/lib/data/repo";
import { isAdmin, requireCohortManager } from "@/lib/authz";
import { formatMoney, formatPercent } from "@/lib/format";
import { formatShortDate, formatTime, relativeDay } from "@/lib/time";

export default async function CohortDashboard({ params }: PageProps<"/admin/cohorts/[cohortId]">) {
  const { cohortId } = await params;
  const user = await requireCohortManager(cohortId);
  const now = new Date();
  const s = cohortStats(cohortId, now);
  const { week, totalWeeks } = cohortWeek(s.cohort, now);
  const base = `/admin/cohorts/${cohortId}`;

  const tiles = [
    { label: "Students", value: String(s.students.length) },
    { label: "Week", value: s.cohort.status === "active" ? `${week}/${totalWeeks}` : s.cohort.status },
    { label: "Attendance", value: formatPercent(s.attendanceRate) },
    { label: "Assignments submitted", value: formatPercent(s.submissionRate) },
    { label: "Average progress", value: `${s.avgProgress}%` },
    ...(isAdmin(user) ? [{ label: "Revenue (est.)", value: formatMoney(s.estimatedRevenueCents) }] : []),
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="bg-surface p-5">
            <dt className="font-mono text-[11px] tracking-wider text-muted uppercase">{t.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">{t.value}</dd>
          </div>
        ))}
      </dl>
      {isAdmin(user) && (
        <p className="text-xs text-muted">Revenue is enrolled students × list price until Stripe is connected.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Needs attention" className="lg:col-span-2">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={`${base}/grading`} className="flex justify-between hover:text-accent">
                <span>Assignments to grade</span>
                <span className="font-mono font-semibold">{s.toGrade}</span>
              </Link>
            </li>
            <li>
              <Link href={`${base}/labs`} className="flex justify-between hover:text-accent">
                <span>Labs waiting for review</span>
                <span className="font-mono font-semibold">{s.labsToReview}</span>
              </Link>
            </li>
          </ul>
          <div className="mt-5 border-t border-line pt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <AlertTriangle size={14} className="text-k-deadline" /> At-risk students ({s.atRisk.length})
            </p>
            {s.atRisk.length === 0 ? (
              <p className="text-sm text-muted">Everyone is on track.</p>
            ) : (
              <ul className="space-y-2">
                {s.atRisk.map((r) => (
                  <li key={r.profile.id} className="flex items-center gap-3 text-sm">
                    <Avatar profile={r.profile} size={24} />
                    <span className="font-medium">{r.profile.fullName}</span>
                    <span className="text-muted">{r.atRisk.join(" · ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title="Upcoming">
          {s.upcoming.length === 0 ? (
            <Empty>Nothing scheduled.</Empty>
          ) : (
            <ul className="space-y-3">
              {s.upcoming.map((u) => (
                <li key={u.id} className="text-sm">
                  <p className="flex items-center gap-2 font-mono text-xs text-muted">
                    <KindMark kind={u.kind} /> {relativeDay(u.at, now)} · {formatTime(u.at)}
                  </p>
                  <p className="mt-0.5 font-medium">{u.title}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Students">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] tracking-wider text-muted uppercase">
                <th className="px-5 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Progress</th>
                <th className="px-3 py-2 font-medium">Attendance</th>
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium">Labs to review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.students.map((r) => (
                <tr key={r.profile.id} className={clsx(r.atRisk.length > 0 && "bg-k-deadline/5")}>
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar profile={r.profile} size={26} />
                      <span className="font-medium">{r.profile.fullName}</span>
                    </span>
                  </td>
                  <td className="w-48 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ProgressBar value={r.progress} segments={10} />
                      </div>
                      <span className="w-9 font-mono text-xs">{r.progress}%</span>
                    </div>
                  </td>
                  <td
                    className={clsx(
                      "px-3 py-2.5 font-mono",
                      r.attendance !== null && r.attendance < 75 && "text-k-deadline",
                    )}
                  >
                    {formatPercent(r.attendance)}
                  </td>
                  <td className={clsx("px-3 py-2.5 font-mono", r.submitted < r.due && "text-k-deadline")}>
                    {r.submitted}/{r.due}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{r.labsPending || "·"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {s.students.length === 0 && <Empty>No students enrolled yet.</Empty>}
      </Card>
      <p className="text-xs text-muted">
        Cohort runs {formatShortDate(s.cohort.startsOn)} to {formatShortDate(s.cohort.endsOn)}. Instructors:{" "}
        {s.instructors.map((i) => i.fullName).join(", ")}.
      </p>
    </div>
  );
}
