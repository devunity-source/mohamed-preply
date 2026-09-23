import Link from "next/link";
import clsx from "clsx";
import { Lock, LockOpen, MessageSquare, Pin, PinOff } from "lucide-react";
import { Avatar, Card, Empty, PageHeader } from "@/components/ui";
import { allSpaces, recentPostsIn } from "@/lib/data/admin";
import { toggleLock, togglePin } from "@/lib/admin-actions";
import { canModerate, requireAdminArea } from "@/lib/authz";
import { timeAgo } from "@/lib/time";

const tool =
  "inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-ink hover:text-ink";

export default async function Moderation() {
  const user = await requireAdminArea();
  const spaces = allSpaces().filter((s) => canModerate(user, s));
  const posts = recentPostsIn(new Set(spaces.map((s) => s.id)));
  const now = new Date();

  return (
    <>
      <PageHeader eyebrow={`${spaces.length} spaces you moderate`} title="Moderation" />
      <Card>
        {posts.length === 0 ? (
          <Empty>No posts in your spaces yet.</Empty>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {posts.map(({ post, author, space, replies }) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar profile={author} size={28} />
                <Link href={`/community/${space.slug}/${post.id}`} className="min-w-48 flex-1 hover:text-accent">
                  <span className="block font-medium">{post.title}</span>
                  <span className="block text-xs text-muted">
                    {author.fullName} in {space.cohortId ? `${space.group} / ` : ""}
                    {space.name} · {timeAgo(post.createdAt, now)}
                  </span>
                </Link>
                <span className="flex items-center gap-1 font-mono text-xs text-muted">
                  <MessageSquare size={12} /> {replies}
                </span>
                <form action={togglePin.bind(null, post.id)}>
                  <button className={clsx(tool, post.pinned && "border-accent text-accent")}>
                    {post.pinned ? <PinOff size={12} /> : <Pin size={12} />} {post.pinned ? "Pinned" : "Pin"}
                  </button>
                </form>
                <form action={toggleLock.bind(null, post.id)}>
                  <button className={clsx(tool, post.locked && "border-ink text-ink")}>
                    {post.locked ? <LockOpen size={12} /> : <Lock size={12} />} {post.locked ? "Locked" : "Lock"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">
        Deleting posts and replies happens on the post itself, so you see the context first.
      </p>
    </>
  );
}
