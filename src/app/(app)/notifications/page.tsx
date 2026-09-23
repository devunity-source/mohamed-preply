import clsx from "clsx";
import { Button, Empty, PageHeader } from "@/components/ui";
import { notificationsFor } from "@/lib/data/repo";
import { markAllRead, openNotification } from "@/lib/actions";
import { currentUser } from "@/lib/session";
import { timeAgo } from "@/lib/time";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const user = await currentUser();
  const list = notificationsFor(user.id);
  const now = new Date();
  const unread = list.some((n) => !n.readAt);

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Inbox" title="Notifications">
        {unread && (
          <form action={markAllRead}>
            <Button variant="ghost">Mark all read</Button>
          </form>
        )}
      </PageHeader>
      {list.length === 0 ? (
        <Empty>You&apos;re all caught up.</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {list.map((n) => (
            <li key={n.id}>
              <form action={openNotification.bind(null, n.id)}>
                <button className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-paper">
                  <span className={clsx("size-2 shrink-0 rounded-[2px]", n.readAt ? "bg-transparent" : "bg-accent")} />
                  <span className={clsx("flex-1 text-sm", n.readAt ? "text-muted" : "font-medium")}>{n.text}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{timeAgo(n.createdAt, now)}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">Email and push delivery arrive in Phase 2.</p>
    </div>
  );
}
