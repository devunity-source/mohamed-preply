import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, UserMinus } from "lucide-react";
import { Avatar, Card, Empty, KindMark, ProgressBar } from "@/components/ui";
import { cohortStats } from "@/lib/data/admin";
import { cohortWeek } from "@/lib/data/repo";
import { isAdmin, requireCohortManager } from "@/lib/authz";
import { AddStudentForm } from "@/components/admin-forms";
import { addStudentToCohort, removeStudentFromCohort } from "@/lib/admin-actions";
import { ConfirmForm } from "@/components/confirm-form";
import { formatMoney, formatPercent } from "@/lib/format";
import { formatShortDate, formatTime, relativeDay } from "@/lib/time";
import { supabaseEnabled } from "@/lib/supabase/config";
import { getI18n } from "@/lib/i18n/server";

const STATUS = {
  upcoming: "teaching.statusUpcoming",
  active: "teaching.statusActive",
  completed: "teaching.statusCompleted",
} as const;

export default async function CohortDashboard({ params }: PageProps<"/admin/cohorts/[cohortId]">) {
  const { t } = await getI18n();
  const { cohortId } = await params;
  const user = await requireCohortManager(cohortId);
  const now = new Date();
  const s = cohortStats(cohortId, now);
  const { week, totalWeeks } = cohortWeek(s.cohort, now);
  const base = `/admin/cohorts/${cohortId}`;

  // Admins manage who's enrolled; a finished cohort's roster is history.
  const canRemove = isAdmin(user) && s.cohort.status !== "completed";

  const tiles = [
    { label: t("teaching.tileStudents"), value: String(s.students.length) },
    {
      label: t("teaching.tileWeek"),
      value: s.cohort.status === "active" ? `${week}/${totalWeeks}` : t(STATUS[s.cohort.status]),
    },
    { label: t("teaching.tileAttendance"), value: formatPercent(s.attendanceRate) },
    { label: t("teaching.tileSubmitted"), value: formatPercent(s.submissionRate) },
    { label: t("teaching.tileProgress"), value: `${s.avgProgress}%` },
    ...(isAdmin(user) ? [{ label: t("teaching.tileRevenue"), value: formatMoney(s.estimatedRevenueCents) }] : []),
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-surface p-5">
            <dt className="text-[13px] text-muted">{tile.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">{tile.value}</dd>
          </div>
        ))}
      </dl>
      {isAdmin(user) && <p className="text-xs text-muted">{t("teaching.revenueNote")}</p>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <Card title={t("teaching.needsAttention")} className="lg:col-span-2">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={`${base}/grading`} className="flex justify-between hover:text-accent">
                <span>{t("teaching.assignmentsToGrade")}</span>
                <span className="font-mono font-semibold">{s.toGrade}</span>
              </Link>
            </li>
            <li>
              <Link href={`${base}/labs`} className="flex justify-between hover:text-accent">
                <span>{t("teaching.labsWaiting")}</span>
                <span className="font-mono font-semibold">{s.labsToReview}</span>
              </Link>
            </li>
          </ul>
          <div className="mt-5 border-t border-line pt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <AlertTriangle size={14} className="text-k-deadline" />{" "}
              {t("teaching.atRiskTitle", { count: s.atRisk.length })}
            </p>
            {s.atRisk.length === 0 ? (
              <p className="text-sm text-muted">{t("teaching.allOnTrack")}</p>
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

        <Card title={t("teaching.upcoming")}>
          {s.upcoming.length === 0 ? (
            <Empty>{t("teaching.nothingScheduled")}</Empty>
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

      <Card title={t("teaching.studentsTitle")}>
        <div className="relative -mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-start font-mono text-[11px] tracking-wider text-muted uppercase">
                <th className="px-5 py-2 font-medium">{t("teaching.colStudent")}</th>
                <th className="px-3 py-2 font-medium">{t("teaching.colProgress")}</th>
                <th className="px-3 py-2 font-medium">{t("teaching.colAttendance")}</th>
                <th className="px-3 py-2 font-medium">{t("teaching.colSubmitted")}</th>
                <th className="px-3 py-2 font-medium">{t("teaching.colLabsToReview")}</th>
                {canRemove && (
                  <th className="px-3 py-2 font-medium">
                    <span className="sr-only">{t("teaching.colActions")}</span>
                  </th>
                )}
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
                  {canRemove && (
                    <td className="px-3 py-2.5 text-end">
                      <ConfirmForm
                        action={removeStudentFromCohort.bind(null, s.cohort.id, r.profile.id)}
                        triggerLabel={t("teaching.removeLabel", { name: r.profile.fullName })}
                        triggerClassName="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-k-deadline/10 hover:text-k-deadline"
                        trigger={
                          <>
                            <UserMinus size={14} /> {t("teaching.remove")}
                          </>
                        }
                        title={t("teaching.removeTitle", { name: r.profile.fullName })}
                        description={t("teaching.removeDescription")}
                        confirmLabel={t("teaching.removeConfirm")}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {s.students.length === 0 && <Empty>{t("teaching.noStudents")}</Empty>}
      </Card>

      {isAdmin(user) && s.cohort.status !== "completed" && (
        <Card title={t("teaching.addStudentTitle")}>
          <p className="mb-4 text-sm text-muted">
            {supabaseEnabled() ? t("teaching.addStudentHelpInvite") : t("teaching.addStudentHelpPassword")}
          </p>
          <AddStudentForm action={addStudentToCohort} cohortId={s.cohort.id} />
        </Card>
      )}
      <p className="text-xs text-muted">
        {t("teaching.cohortRuns", {
          start: formatShortDate(s.cohort.startsOn),
          end: formatShortDate(s.cohort.endsOn),
          names: s.instructors.map((i) => i.fullName).join(t("teaching.listSeparator")),
        })}
      </p>
    </div>
  );
}
