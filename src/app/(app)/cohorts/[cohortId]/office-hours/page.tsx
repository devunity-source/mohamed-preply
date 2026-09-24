import { ButtonLink, Card, Empty } from "@/components/ui";
import { MarkThreadRead, OfficeMessageForm } from "@/components/office-hours";
import { Conversation, OfficeStatusBanner, officeStatusText, WeeklySchedule } from "@/components/office-hours-view";
import { cohortRoster } from "@/lib/data/repo";
import { messagesIn, officeHoursFor, officeStatus, threadFor, unreadRepliesFor } from "@/lib/data/office-hours";
import { loadCohort } from "../load";

export const metadata = { title: "Office hours" };

export default async function OfficeHours({ params }: PageProps<"/cohorts/[cohortId]/office-hours">) {
  const { user, cohort, role } = await loadCohort(params);
  const now = new Date();
  const status = officeStatus(cohort.id, now);
  const slots = officeHoursFor(cohort.id);
  const instructors = cohortRoster(cohort.id).instructors;
  const thread = role === "student" ? threadFor(cohort.id, user.id) : undefined;
  const messages = thread ? messagesIn(thread.id) : [];
  const { detail } = officeStatusText(status, now);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
      <div className="space-y-5 lg:col-span-2">
        <OfficeStatusBanner status={status} now={now} />

        {role === "student" ? (
          <Card
            title={
              instructors.length
                ? `Ask ${instructors.map((i) => i.fullName.split(" ")[0]).join(" or ")}`
                : "Ask your instructor"
            }
          >
            <OfficeMessageForm
              cohortId={cohort.id}
              open={status.open}
              closedNote={
                status.hasSchedule
                  ? `Office hours are closed. ${detail}.`
                  : "Your instructor hasn't set office hours yet."
              }
            />
            {!status.open && (
              <p className="mt-3 text-sm text-muted">
                Can&apos;t wait? Post in your cohort&apos;s Questions space. Classmates often answer faster.
              </p>
            )}
          </Card>
        ) : (
          <Card title="You're staff in this cohort">
            <p className="mb-4 text-sm text-muted">Students write to you here. Read and reply from your inbox.</p>
            <ButtonLink href={`/admin/cohorts/${cohort.id}/office-hours`}>Open inbox</ButtonLink>
          </Card>
        )}

        {role === "student" && (
          <Card title="Your messages">
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
              <Empty>No messages yet. Anything you send shows up here, with your instructor&apos;s replies.</Empty>
            )}
          </Card>
        )}
      </div>

      <div className="space-y-5">
        <Card title="Weekly hours (UAE time)">
          <WeeklySchedule slots={slots} now={now} />
          <p className="mt-4 text-xs text-muted">
            You can send messages during these hours. Replies can come any time, and you&apos;ll get a notification.
          </p>
        </Card>
      </div>
    </div>
  );
}
