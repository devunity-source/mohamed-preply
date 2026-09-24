import Link from "next/link";
import { Award, RotateCcw, Ban } from "lucide-react";
import { Avatar, buttonClass, Card, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { cohortCertificates } from "@/lib/data/admin";
import { issueCertificate, setCertificateRevoked } from "@/lib/admin-actions";
import { requireAdmin, requireCohortManager } from "@/lib/authz";
import { formatShortDate } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminCertificates({ params }: PageProps<"/admin/cohorts/[cohortId]/certificates">) {
  const { t } = await getI18n();
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  await requireAdmin();
  const rows = cohortCertificates(cohortId);
  const eligible = rows.filter((r) => r.progress === 100 && !r.certificate).length;

  return (
    <Card
      title={t("teaching.certificatesTitle", {
        count: rows.filter((r) => r.certificate && !r.certificate.revokedAt).length,
      })}
    >
      <p className="mb-5 text-sm text-muted">
        {eligible > 0 ? t("teaching.certificatesHelpReady", { count: eligible }) : t("teaching.certificatesHelpNone")}
      </p>
      <ul className="-my-2 divide-y divide-line">
        {rows.map(({ profile, progress, certificate }) => (
          <li key={profile.id} className="flex flex-wrap items-center gap-3 py-3">
            <Avatar profile={profile} size={28} />
            <span className="min-w-36 flex-1 font-medium">{profile.fullName}</span>
            <span className="w-12 text-end font-mono text-sm">{progress}%</span>
            {certificate ? (
              <>
                <Link
                  href={`/verify/${certificate.id}`}
                  dir="ltr"
                  className="font-mono text-xs underline hover:text-accent"
                >
                  {certificate.id}
                </Link>
                {certificate.revokedAt ? (
                  <>
                    <Pill tone="bad">{t("teaching.revokedOn", { date: formatShortDate(certificate.revokedAt) })}</Pill>
                    <form action={setCertificateRevoked.bind(null, certificate.id, false)}>
                      <SubmitButton variant="ghost">
                        <RotateCcw size={14} /> {t("teaching.restore")}
                      </SubmitButton>
                    </form>
                  </>
                ) : (
                  <>
                    <Pill tone="good">{t("teaching.issuedOn", { date: formatShortDate(certificate.issuedAt) })}</Pill>
                    <ConfirmForm
                      action={setCertificateRevoked.bind(null, certificate.id, true)}
                      triggerClassName={buttonClass("ghost")}
                      trigger={
                        <>
                          <Ban size={14} /> {t("teaching.revoke")}
                        </>
                      }
                      title={t("teaching.revokeTitle", { name: profile.fullName })}
                      description={t("teaching.revokeDescription", { id: certificate.id })}
                      confirmLabel={t("teaching.revokeConfirm")}
                    />
                  </>
                )}
              </>
            ) : progress === 100 ? (
              <form action={issueCertificate.bind(null, profile.id, cohortId)}>
                <SubmitButton>
                  <Award size={14} /> {t("teaching.issueCertificate")}
                </SubmitButton>
              </form>
            ) : (
              <Pill>{t("teaching.notComplete")}</Pill>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
