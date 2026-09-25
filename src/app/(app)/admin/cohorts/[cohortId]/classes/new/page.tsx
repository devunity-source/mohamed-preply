import { Card } from "@/components/ui";
import { ClassForm } from "@/components/class-form";
import { cohortById } from "@/lib/data/admin";
import { modulesFor } from "@/lib/data/repo";
import { requireCohortManager } from "@/lib/authz";
import { canCreateMeetings } from "@/lib/integrations/video";
import { getI18n } from "@/lib/i18n/server";
import { addDays } from "@/lib/time";

export default async function NewClass({ params }: PageProps<"/admin/cohorts/[cohortId]/classes/new">) {
  const { t } = await getI18n();
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  const cohort = cohortById(cohortId)!;
  return (
    <Card title={t("teaching.scheduleAClass")} className="max-w-2xl">
      <ClassForm
        cohortId={cohortId}
        modules={modulesFor(cohort.programmeId).map((m) => m.module)}
        defaultStart={addDays(new Date(), 1, "19:00")}
        autoMeetings={canCreateMeetings("zoom")}
      />
    </Card>
  );
}
