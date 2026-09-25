import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { ClassForm } from "@/components/class-form";
import { cohortById } from "@/lib/data/admin";
import { cohortClasses, modulesFor } from "@/lib/data/repo";
import { requireCohortManager } from "@/lib/authz";
import { canCreateMeetings } from "@/lib/integrations/video";
import { getI18n } from "@/lib/i18n/server";

export default async function EditClass({ params }: PageProps<"/admin/cohorts/[cohortId]/classes/[classId]">) {
  const { t } = await getI18n();
  const { cohortId, classId } = await params;
  await requireCohortManager(cohortId);
  const existing = cohortClasses(cohortId).find((c) => c.id === classId);
  if (!existing) notFound();
  const cohort = cohortById(cohortId)!;
  return (
    <Card title={t("teaching.editClass")} className="max-w-2xl">
      <ClassForm
        cohortId={cohortId}
        modules={modulesFor(cohort.programmeId).map((m) => m.module)}
        existing={existing}
        defaultStart={existing.startsAt}
        autoMeetings={canCreateMeetings(existing.provider)}
      />
    </Card>
  );
}
