import clsx from "clsx";
import { Check, Undo2 } from "lucide-react";
import { Avatar, Card, Empty } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { labBoard } from "@/lib/data/admin";
import { labStatus } from "@/lib/data/repo";
import { reviewLab } from "@/lib/admin-actions";
import { requireCohortManager } from "@/lib/authz";
import type { LabStatus } from "@/lib/types";
import { getI18n } from "@/lib/i18n/server";

const CELL = {
  passed: { label: "✓", title: "teaching.labPassed", className: "bg-ink text-paper" },
  submitted: { label: "?", title: "teaching.labSubmitted", className: "bg-accent text-accent-ink" },
  in_progress: { label: "…", title: "teaching.labInProgress", className: "border border-line text-muted" },
  not_started: { label: "", title: "teaching.labNotStarted", className: "border border-dashed border-line" },
} as const satisfies Record<LabStatus, { label: string; title: string; className: string }>;

export default async function LabReviews({ params }: PageProps<"/admin/cohorts/[cohortId]/labs">) {
  const { t } = await getI18n();
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  const { labs, students, queue } = labBoard(cohortId);

  return (
    <div className="space-y-5">
      <Card title={t("teaching.waitingForReviewTitle", { count: queue.length })}>
        {queue.length === 0 ? (
          <Empty>{t("teaching.noLabsWaiting")}</Empty>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {queue.map(({ lab, profile }) => (
              <li key={`${lab.id}-${profile.id}`} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar profile={profile} size={28} />
                <span className="flex-1">
                  <span className="block font-medium">{profile.fullName}</span>
                  <span className="block text-sm text-muted">
                    {t("teaching.labLine", { number: String(lab.number).padStart(2, "0"), title: lab.title })}
                  </span>
                </span>
                <form action={reviewLab.bind(null, lab.id, profile.id, "return")}>
                  <SubmitButton variant="ghost">
                    <Undo2 size={14} /> {t("teaching.returnLab")}
                  </SubmitButton>
                </form>
                <form action={reviewLab.bind(null, lab.id, profile.id, "pass")}>
                  <SubmitButton>
                    <Check size={14} /> {t("teaching.passLab")}
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t("teaching.allLabs")}>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="text-sm">
            <thead>
              <tr className="font-mono text-[11px] text-muted">
                <th className="pe-4 pb-2 text-start font-medium">{t("teaching.colStudent")}</th>
                {labs.map((l) => (
                  <th key={l.id} className="w-9 pb-2 font-medium" title={l.title}>
                    #{String(l.number).padStart(2, "0")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((p) => (
                <tr key={p.id}>
                  <td className="py-1 pe-4 whitespace-nowrap">{p.fullName}</td>
                  {labs.map((l) => {
                    const st = labStatus(p.id, l.id);
                    return (
                      <td key={l.id} className="p-0.5">
                        <span
                          title={t(CELL[st].title)}
                          className={clsx(
                            "flex size-8 items-center justify-center rounded-[4px] font-mono text-xs",
                            CELL[st].className,
                          )}
                        >
                          {CELL[st].label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted uppercase">
          <span>{t("teaching.legendPassed")}</span>
          <span>{t("teaching.legendWaiting")}</span>
          <span>{t("teaching.legendInProgress")}</span>
          <span>{t("teaching.legendNotStarted")}</span>
        </p>
      </Card>
    </div>
  );
}
