import Link from "next/link";
import { BadgeCheck, Lock } from "lucide-react";
import { Card, ProgressBar, ProgressBreakdown } from "@/components/ui";
import { Certificate } from "@/components/certificate";
import { PrintButton } from "@/components/print-button";
import { certificateFor } from "@/lib/data/admin";
import { progressFor } from "@/lib/data/repo";
import { formatDate, formatMonthYear } from "@/lib/time";
import { loadCohort } from "../load";

export default async function CertificatePage({ params }: PageProps<"/cohorts/[cohortId]/certificate">) {
  const { user, cohort, programme, role } = await loadCohort(params);
  const progress = role === "student" ? progressFor(user.id, cohort) : null;
  const cert = role === "student" ? certificateFor(user.id, cohort.id) : undefined;
  const issued = cert && !cert.revokedAt ? cert : undefined;
  const period = `${formatMonthYear(cohort.startsOn)} to ${formatMonthYear(cohort.endsOn)}`;

  return (
    <div className="grid gap-5 lg:grid-cols-3 print:block">
      <div className="relative lg:col-span-2">
        <Certificate
          name={role === "student" ? user.fullName : "Student Name"}
          programme={programme.title}
          period={period}
          certificateId={issued ? issued.id : "Preview"}
        />
        {!issued && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-paper/40 backdrop-blur-[2px]">
            <span className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
              <Lock size={14} /> {cert?.revokedAt ? "Revoked" : "Preview"}
            </span>
          </div>
        )}
      </div>

      {issued ? (
        <Card title="Your certificate" className="print:hidden">
          <p className="flex items-center gap-2 font-medium">
            <BadgeCheck size={18} className="text-k-office" /> Issued {formatDate(issued.issuedAt)}
          </p>
          <p className="mt-3 text-sm text-muted">
            Share the verification link on your CV or LinkedIn. Anyone can check it without signing in.
          </p>
          <Link
            href={`/verify/${issued.id}`}
            className="mt-3 block truncate font-mono text-sm underline hover:text-accent"
          >
            /verify/{issued.id}
          </Link>
          <div className="mt-5">
            <PrintButton />
          </div>
        </Card>
      ) : (
        <Card title="How to earn it" className="print:hidden">
          <ul className="space-y-2 text-sm">
            <li>Complete every lesson</li>
            <li>Submit every lab and assignment</li>
            <li>Present your capstone</li>
          </ul>
          {progress && (
            <div className="mt-5">
              <p className="mb-2 font-mono text-sm">{progress.percent}% complete</p>
              <ProgressBar value={progress.percent} />
              <ProgressBreakdown progress={progress} className="mt-3" />
            </div>
          )}
          <p className="mt-5 text-xs text-muted">
            {cert?.revokedAt
              ? "This certificate was revoked. Contact the academy if you think that's a mistake."
              : "Once you finish, the academy issues your certificate with a public verification link."}
          </p>
        </Card>
      )}
    </div>
  );
}
