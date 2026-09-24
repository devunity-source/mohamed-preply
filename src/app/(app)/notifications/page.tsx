import clsx from "clsx";
import { Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { notificationsFor } from "@/lib/data/repo";
import { markAllRead, openNotification } from "@/lib/actions";
import { currentUser } from "@/lib/session";
import { timeAgo } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { notificationText } from "@/lib/i18n/content";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("notifications.metaTitle") };
}

export default async function Notifications() {
  const { t, locale } = await getI18n();
  const user = await currentUser();
  const list = notificationsFor(user.id);
  const now = new Date();
  const unread = list.some((n) => !n.readAt);

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={t("notifications.eyebrow")} title={t("notifications.title")}>
        {unread && (
          <form action={markAllRead}>
            <SubmitButton variant="ghost">{t("notifications.markAllRead")}</SubmitButton>
          </form>
        )}
      </PageHeader>
      {list.length === 0 ? (
        <Empty>{t("notifications.allCaughtUp")}</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {list.map((n) => (
            <li key={n.id}>
              <form action={openNotification.bind(null, n.id)}>
                <SubmitButton unstyled className="flex w-full items-center gap-4 px-5 py-4 text-start hover:bg-paper">
                  <span className={clsx("size-2 shrink-0 rounded-[2px]", n.readAt ? "bg-transparent" : "bg-accent")} />
                  <span className={clsx("flex-1 text-sm", n.readAt ? "text-muted" : "font-medium")}>
                    {notificationText(n, locale)}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted">{timeAgo(n.createdAt, now)}</span>
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">{t("notifications.phase2")}</p>
    </div>
  );
}
