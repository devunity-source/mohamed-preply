import { ButtonLink, Card, Empty } from "@/components/ui";
import { MarkThreadRead, OfficeMessageForm } from "@/components/office-hours";
import { Conversation, OfficeStatusBanner, officeStatusText, WeeklySchedule } from "@/components/office-hours-view";
import { cohortRoster } from "@/lib/data/repo";
import { messagesIn, officeHoursFor, officeStatus, threadFor, unreadRepliesFor } from "@/lib/data/office-hours";
import { getI18n } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";
import { loadCohort } from "../load";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("officeHours.metaTitle") };
}

export default async function OfficeHours({ params }: PageProps<"/cohorts/[cohortId]/office-hours">) {
  const { t, locale } = await getI18n();
  const { user, cohort, role } = await loadCohort(params);
  const now = new Date();
  const status = officeStatus(cohort.id, now);
  const slots = officeHoursFor(cohort.id);
  const instructors = cohortRoster(cohort.id).instructors;
  const thread = role === "student" ? threadFor(cohort.id, user.id) : undefined;
  const messages = thread ? messagesIn(thread.id) : [];
  const { detail } = officeStatusText(status, now, t);
  const names = new Intl.ListFormat(intlLocale(locale), { type: "disjunction" }).format(
    instructors.map((i) => i.fullName.split(" ")[0]),
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
      <div className="space-y-5 lg:col-span-2">
        <OfficeStatusBanner status={status} now={now} t={t} />

        {role === "student" ? (
          <Card title={instructors.length ? t("officeHours.askNames", { names }) : t("officeHours.askInstructor")}>
            <OfficeMessageForm
              cohortId={cohort.id}
              open={status.open}
              closedNote={status.hasSchedule ? t("officeHours.closedNote", { detail }) : t("officeHours.notSet")}
            />
            {!status.open && <p className="mt-3 text-sm text-muted">{t("officeHours.cantWait")}</p>}
          </Card>
        ) : (
          <Card title={t("officeHours.staffTitle")}>
            <p className="mb-4 text-sm text-muted">{t("officeHours.staffNote")}</p>
            <ButtonLink href={`/admin/cohorts/${cohort.id}/office-hours`}>{t("officeHours.openInbox")}</ButtonLink>
          </Card>
        )}

        {role === "student" && (
          <Card title={t("officeHours.yourMessages")}>
            {thread && (
              <MarkThreadRead
                threadId={thread.id}
                latestId={messages.at(-1)?.id}
                unread={unreadRepliesFor(cohort.id, user.id) > 0}
              />
            )}
            {messages.length ? (
              <Conversation messages={messages} viewerId={user.id} now={now} />
            ) : (
              <Empty>{t("officeHours.noMessages")}</Empty>
            )}
          </Card>
        )}
      </div>

      <div className="space-y-5">
        <Card title={t("officeHours.weeklyHours")}>
          <WeeklySchedule slots={slots} now={now} t={t} />
          <p className="mt-4 text-xs text-muted">{t("officeHours.sendNote")}</p>
        </Card>
      </div>
    </div>
  );
}
