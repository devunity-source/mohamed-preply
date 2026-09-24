import Link from "next/link";
import { Award, RotateCcw, Ban } from "lucide-react";
import { Avatar, buttonClass, Card, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { cohortCertificates } from "@/lib/data/admin";
import { issueCertificate, setCertificateRevoked } from "@/lib/admin-actions";
import { requireAdmin, requireCohortManager } from "@/lib/authz";
import { formatShortDate } from "@/lib/time";

export default async function AdminCertificates({ params }: PageProps<"/admin/cohorts/[cohortId]/certificates">) {
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  await requireAdmin();
  const rows = cohortCertificates(cohortId);
  const eligible = rows.filter((r) => r.progress === 100 && !r.certificate).length;

  return (
    <Card title={`Certificates · ${rows.filter((r) => r.certificate && !r.certificate.revokedAt).length} issued`}>
      <p className="mb-5 text-sm text-muted">
        Students become eligible at 100% (every lesson, lab and assignment).{" "}
        {eligible > 0 ? `${eligible} ready to issue.` : "Nobody is waiting."}
      </p>
      <ul className="-my-2 divide-y divide-line">
        {rows.map(({ profile, progress, certificate }) => (
          <li key={profile.id} className="flex flex-wrap items-center gap-3 py-3">
            <Avatar profile={profile} size={28} />
            <span className="min-w-36 flex-1 font-medium">{profile.fullName}</span>
            <span className="w-12 text-right font-mono text-sm">{progress}%</span>
            {certificate ? (
              <>
                <Link href={`/verify/${certificate.id}`} className="font-mono text-xs underline hover:text-accent">
                  {certificate.id}
                </Link>
                {certificate.revokedAt ? (
                  <>
                    <Pill tone="bad">Revoked {formatShortDate(certificate.revokedAt)}</Pill>
                    <form action={setCertificateRevoked.bind(null, certificate.id, false)}>
                      <SubmitButton variant="ghost">
                        <RotateCcw size={14} /> Restore
                      </SubmitButton>
                    </form>
                  </>
                ) : (
                  <>
                    <Pill tone="good">Issued {formatShortDate(certificate.issuedAt)}</Pill>
                    <ConfirmForm
                      action={setCertificateRevoked.bind(null, certificate.id, true)}
                      triggerClassName={buttonClass("ghost")}
                      trigger={
                        <>
                          <Ban size={14} /> Revoke
                        </>
                      }
                      title={`Revoke ${profile.fullName}'s certificate?`}
                      description={`${certificate.id} will show as revoked on its public verification page. You can restore it later.`}
                      confirmLabel="Revoke certificate"
                    />
                  </>
                )}
              </>
            ) : progress === 100 ? (
              <form action={issueCertificate.bind(null, profile.id, cohortId)}>
                <SubmitButton>
                  <Award size={14} /> Issue certificate
                </SubmitButton>
              </form>
            ) : (
              <Pill>Not complete</Pill>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
