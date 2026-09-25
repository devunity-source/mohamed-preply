import Link from "next/link";
import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { ButtonLink, Pill } from "@/components/ui";
import { cohortClasses } from "@/lib/data/repo";
import { deleteClass } from "@/lib/admin-actions";
import { requireCohortManager } from "@/lib/authz";
import { formatShortDate, formatTime, formatWeekday } from "@/lib/time";
import { ConfirmForm } from "@/components/confirm-form";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminClasses({ params }: PageProps<"/admin/cohorts/[cohortId]/classes">) {
  const { t, locale } = await getI18n();
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  const now = new Date();
  const classes = cohortClasses(cohortId);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <ButtonLink href={`/admin/cohorts/${cohortId}/classes/new`}>
          <Plus size={14} /> {t("teaching.scheduleAClass")}
        </ButtonLink>
      </div>
      <ol className="divide-y divide-line rounded-md border border-line bg-surface">
        {classes.map((c) => {
          const past = c.startsAt < now;
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3">
              <span className="w-36 font-mono text-xs text-muted rtl:w-44">
                {locale === "ar" ? formatWeekday(c.startsAt) : formatWeekday(c.startsAt).slice(0, 3)}{" "}
                {formatShortDate(c.startsAt)} · {formatTime(c.startsAt)}
              </span>
              <Link
                href={`/admin/cohorts/${cohortId}/classes/${c.id}`}
                className={clsx("flex-1 font-medium hover:text-accent", past && "text-muted")}
              >
                {c.title}
              </Link>
              {past ? (
                c.recordingUrl ? (
                  <Pill tone="good">{t("teaching.recorded")}</Pill>
                ) : (
                  <Pill tone="warn">{t("teaching.needsRecording")}</Pill>
                )
              ) : (
                <ConfirmForm
                  action={deleteClass.bind(null, c.id)}
                  triggerLabel={t("teaching.deleteClassLabel", { title: c.title })}
                  triggerClassName="rounded-md p-1.5 text-muted hover:bg-k-deadline/10 hover:text-k-deadline"
                  trigger={<Trash2 size={14} />}
                  title={t("teaching.deleteClassTitle", { title: c.title })}
                  description={t("teaching.deleteClassDescription")}
                  confirmLabel={t("teaching.deleteClassConfirm")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
