import { Lock } from "lucide-react";
import { Card, ProgressBar } from "@/components/ui";
import { Certificate } from "@/components/certificate";
import { progressFor } from "@/lib/data/repo";
import { formatMonthYear } from "@/lib/time";
import { loadCohort } from "../load";

export default async function CertificatePage({ params }: PageProps<"/cohorts/[cohortId]/certificate">) {
  const { user, cohort, programme, role } = await loadCohort(params);
  const progress = role === "student" ? progressFor(user.id, cohort) : null;
  const unlocked = progress?.percent === 100;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="relative lg:col-span-2">
        <Certificate
          name={role === "student" ? user.fullName : "Student Name"}
          programme={programme.title}
          period={`${formatMonthYear(cohort.startsOn)} to ${formatMonthYear(cohort.endsOn)}`}
          certificateId={unlocked ? "Issued on completion" : "Preview"}
        />
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-paper/40 backdrop-blur-[2px]">
            <span className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
              <Lock size={14} /> Preview
            </span>
          </div>
        )}
      </div>
      <Card title="How to earn it">
        <ul className="space-y-2 text-sm">
          <li>Complete every lesson</li>
          <li>Submit every lab and assignment</li>
          <li>Present your capstone</li>
        </ul>
        {progress && (
          <div className="mt-5">
            <p className="mb-2 font-mono text-sm">{progress.percent}% complete</p>
            <ProgressBar value={progress.percent} />
          </div>
        )}
        <p className="mt-5 text-xs text-muted">
          Each certificate gets a public verification link. Issuing arrives in Phase 3.
        </p>
      </Card>
    </div>
  );
}
