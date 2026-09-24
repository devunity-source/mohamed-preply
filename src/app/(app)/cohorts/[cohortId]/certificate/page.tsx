import Link from "next/link";
import { BadgeCheck, Lock } from "lucide-react";
import { Card, ProgressBar, ProgressBreakdown } from "@/components/ui";
import { Certificate } from "@/components/certificate";
import { PrintButton } from "@/components/print-button";
import { certificateFor } from "@/lib/data/admin";
import { progressFor } from "@/lib/data/repo";
import { formatDate, formatMonthYear } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import { loadCohort } from "../load";

export default async function CertificatePage({ params }: PageProps<"/cohorts/[cohortId]/certificate">) {
  const { t, locale } = await getI18n();
  const { user, cohort, role, ...rest } = await loadCohort(params);
  const programme = loc(rest.programme, locale);
  const progress = role === "student" ? progressFor(user.id, cohort) : null;
  const cert = role === "student" ? certificateFor(user.id, cohort.id) : undefined;
  const issued = cert && !cert.revokedAt ? cert : undefined;
  const period = t("certificate.period", {
    start: formatMonthYear(cohort.startsOn),
    end: formatMonthYear(cohort.endsOn),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-3 print:block">
      <div className="relative lg:col-span-2">
        <Certificate
          name={role === "student" ? user.fullName : t("certificate.studentName")}
          programme={programme.title}
          period={period}
          certificateId={issued ? issued.id : t("certificate.preview")}
        />
        {!issued && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-paper/40 backdrop-blur-[2px]">
            <span className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
              <Lock size={14} /> {cert?.revokedAt ? t("certificate.revoked") : t("certificate.preview")}
            </span>
          </div>
        )}
      </div>

      {issued ? (
        <Card title={t("certificate.yourCertificate")} className="print:hidden">
          <p className="flex items-center gap-2 font-medium">
            <BadgeCheck size={18} className="text-k-office" />{" "}
            {t("certificate.issued", { date: formatDate(issued.issuedAt) })}
          </p>
          <p className="mt-3 text-sm text-muted">{t("certificate.shareNote")}</p>
          <Link
            href={`/verify/${issued.id}`}
            dir="ltr"
            className="mt-3 block truncate text-start font-mono text-sm underline hover:text-accent"
          >
            /verify/{issued.id}
          </Link>
          <div className="mt-5">
            <PrintButton label={t("certificate.print")} />
          </div>
        </Card>
      ) : (
        <Card title={t("certificate.howToEarn")} className="print:hidden">
          <ul className="space-y-2 text-sm">
            <li>{t("certificate.earnLessons")}</li>
            <li>{t("certificate.earnSubmit")}</li>
            <li>{t("certificate.earnCapstone")}</li>
          </ul>
          {progress && (
            <div className="mt-5">
              <p className="mb-2 font-mono text-sm">
                {t("certificate.percentComplete", { percent: progress.percent })}
              </p>
              <ProgressBar value={progress.percent} />
              <ProgressBreakdown progress={progress} className="mt-3" />
            </div>
          )}
          <p className="mt-5 text-xs text-muted">
            {cert?.revokedAt ? t("certificate.revokedNote") : t("certificate.issueNote")}
          </p>
        </Card>
      )}
    </div>
  );
}
