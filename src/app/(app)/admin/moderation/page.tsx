import Link from "next/link";
import clsx from "clsx";
import { Lock, LockOpen, MessageSquare, Pin, PinOff } from "lucide-react";
import { Avatar, Card, Empty, PageHeader } from "@/components/ui";
import { allSpaces, recentPostsIn } from "@/lib/data/admin";
import { toggleLock, togglePin } from "@/lib/admin-actions";
import { canModerate, requireAdminArea } from "@/lib/authz";
import { timeAgo } from "@/lib/time";
import { SubmitButton } from "@/components/submit-button";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";

const tool =
  "inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-ink hover:text-ink";

export default async function Moderation() {
  const { t, locale } = await getI18n();
  const user = await requireAdminArea();
  const spaces = allSpaces().filter((s) => canModerate(user, s));
  const posts = recentPostsIn(new Set(spaces.map((s) => s.id)));
  const now = new Date();

  return (
    <>
      <PageHeader eyebrow={t("admin.spacesYouModerate", { count: spaces.length })} title={t("admin.moderationTitle")} />
      <Card>
        {posts.length === 0 ? (
          <Empty>{t("admin.noPosts")}</Empty>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {posts.map(({ post, author, space: raw, replies }) => {
              const space = loc(raw, locale);
              return (
                <li key={post.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar profile={author} size={28} />
                  <Link href={`/community/${space.slug}/${post.id}`} className="min-w-48 flex-1 hover:text-accent">
                    <span className="block font-medium">{post.title}</span>
                    <span className="block text-xs text-muted">
                      {t("admin.postMeta", {
                        author: author.fullName,
                        space: space.cohortId ? `${space.group} / ${space.name}` : space.name,
                        ago: timeAgo(post.createdAt, now),
                      })}
                    </span>
                  </Link>
                  <span className="flex items-center gap-1 font-mono text-xs text-muted">
                    <MessageSquare size={12} /> {replies}
                  </span>
                  <form action={togglePin.bind(null, post.id)}>
                    <SubmitButton unstyled className={clsx(tool, post.pinned && "border-accent text-accent")}>
                      {post.pinned ? <PinOff size={12} /> : <Pin size={12} />}{" "}
                      {post.pinned ? t("admin.pinned") : t("admin.pin")}
                    </SubmitButton>
                  </form>
                  <form action={toggleLock.bind(null, post.id)}>
                    <SubmitButton unstyled className={clsx(tool, post.locked && "border-ink text-ink")}>
                      {post.locked ? <LockOpen size={12} /> : <Lock size={12} />}{" "}
                      {post.locked ? t("admin.locked") : t("admin.lock")}
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">{t("admin.deleteNote")}</p>
    </>
  );
}
