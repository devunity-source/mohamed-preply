import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, Pin } from "lucide-react";
import { Avatar, Label } from "@/components/ui";
import { CommentForm } from "@/components/community-forms";
import { RichText } from "@/components/rich-text";
import { postWithComments } from "@/lib/data/repo";
import { toggleReaction } from "@/lib/actions";
import { currentUser } from "@/lib/session";
import { timeAgo } from "@/lib/time";

const EMOJI = ["👍", "🔥", "🎉", "💡", "❤️"];

export default async function PostPage({ params }: PageProps<"/community/[space]/[postId]">) {
  const { space: slug, postId } = await params;
  const user = await currentUser();
  const view = postWithComments(postId, user.id);
  if (!view || view.space.slug !== slug) notFound();

  const { post, author, space, reactions, comments } = view;
  const now = new Date();

  return (
    <article className="max-w-3xl">
      <Link
        href={`/community/${space.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> {space.name}
      </Link>

      <header className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <Avatar profile={author} size={36} />
          <div>
            <p className="text-sm font-medium">
              {author.fullName}
              {author.role !== "student" && (
                <span className="ml-2 font-mono text-[11px] text-accent uppercase">{author.role}</span>
              )}
            </p>
            <p className="text-xs text-muted">{timeAgo(post.createdAt, now)}</p>
          </div>
          {post.pinned && <Pin size={16} className="ml-auto text-accent" />}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      </header>

      <RichText text={post.body} />

      <div className="mt-6 flex flex-wrap gap-2">
        {EMOJI.map((e) => {
          const r = reactions.find((x) => x.emoji === e);
          return (
            <form key={e} action={toggleReaction.bind(null, post.id, e)}>
              <button
                aria-pressed={!!r?.mine}
                className={clsx(
                  "rounded-md border px-2.5 py-1 font-mono text-sm transition-colors",
                  r?.mine ? "border-accent bg-accent/10" : "border-line hover:border-ink",
                )}
              >
                {e} {r?.count ?? ""}
              </button>
            </form>
          );
        })}
      </div>

      <section className="mt-10 border-t border-line pt-8">
        <Label className="mb-5">
          {comments.length} {comments.length === 1 ? "reply" : "replies"}
        </Label>
        <ol className="space-y-6">
          {comments.map(({ comment, author: a }) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar profile={a} size={28} />
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm">
                  <span className="font-medium">{a.fullName}</span>
                  <span className="text-muted"> · {timeAgo(comment.createdAt, now)}</span>
                </p>
                <div className="text-sm">
                  <RichText text={comment.body} />
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <CommentForm postId={post.id} />
        </div>
      </section>
    </article>
  );
}
