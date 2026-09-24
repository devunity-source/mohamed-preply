import Link from "next/link";
import { Lock, MessageSquare, Pin } from "lucide-react";
import { Avatar, Pill } from "@/components/ui";
import type { PostView } from "@/lib/data/repo";
import { timeAgo } from "@/lib/time";

export function PostCard({
  view,
  now,
  showSpace,
  isNew,
}: {
  view: PostView;
  now: Date;
  showSpace?: boolean;
  isNew?: boolean;
}) {
  const { post, author, space, commentCount, reactions } = view;
  return (
    <Link
      href={`/community/${space.slug}/${post.id}`}
      className="block rounded-md border border-line bg-surface p-5 transition-colors hover:border-ink"
    >
      <div className="mb-3 flex items-center gap-2.5 text-sm">
        <Avatar profile={author} size={24} />
        <span className="font-medium">{author.fullName}</span>
        <span className="text-muted">· {timeAgo(post.createdAt, now)}</span>
        {isNew && <Pill tone="accent">New</Pill>}
        {showSpace && (
          <span className="ml-auto font-mono text-[11px] tracking-wider text-muted uppercase">
            {space.cohortId ? `${space.group} / ` : ""}
            {space.name}
          </span>
        )}
        {post.pinned && !showSpace && <Pin size={14} className="ml-auto text-accent" />}
      </div>
      <h3 className="font-semibold tracking-tight">{post.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{post.body}</p>
      <div className="mt-4 flex items-center gap-3 font-mono text-xs text-muted">
        {reactions.map((r) => (
          <span key={r.emoji}>
            {r.emoji} {r.count}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <MessageSquare size={12} /> {commentCount}
        </span>
        {post.locked && (
          <span className="flex items-center gap-1">
            <Lock size={12} /> Locked
          </span>
        )}
      </div>
    </Link>
  );
}
