import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, Lock, LockOpen, Pin, PinOff, Trash2 } from "lucide-react";
import { Avatar, Label } from "@/components/ui";
import { CommentForm } from "@/components/community-forms";
import { ConfirmForm } from "@/components/confirm-form";
import { ReactionBar } from "@/components/reaction-bar";
import { SubmitButton } from "@/components/submit-button";
import { RichText } from "@/components/rich-text";
import { postWithComments } from "@/lib/data/repo";
import { deleteComment, deletePost, toggleLock, togglePin } from "@/lib/admin-actions";
import { canModerate } from "@/lib/authz";
import { currentUser } from "@/lib/session";
import { timeAgo } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import type { Key } from "@/lib/i18n/translate";
import type { Role } from "@/lib/types";

const ROLE_LABEL: Record<Role, Key> = {
  student: "common.roleStudent",
  instructor: "common.roleInstructor",
  admin: "common.roleAdmin",
};

const toolClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs hover:border-ink";

export default async function PostPage({ params }: PageProps<"/community/[space]/[postId]">) {
  const { t, locale } = await getI18n();
  const { space: slug, postId } = await params;
  const user = await currentUser();
  const view = postWithComments(postId, user.id);
  if (!view || view.space.slug !== slug) notFound();

  const { post, author, space, reactions, comments } = view;
  const now = new Date();
  const moderator = canModerate(user, space);
  const canDelete = moderator || post.authorId === user.id;

  return (
    <article className="max-w-3xl">
      <Link
        href={`/community/${space.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} className="rtl:-scale-x-100" /> {loc(space, locale).name}
      </Link>

      <header className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <Avatar profile={author} size={36} />
          <div>
            <p className="text-sm font-medium">
              {author.fullName}
              {author.role !== "student" && (
                <span className="ms-2 font-mono text-[11px] text-muted uppercase">{t(ROLE_LABEL[author.role])}</span>
              )}
            </p>
            <p className="text-xs text-muted">{timeAgo(post.createdAt, now)}</p>
          </div>
          {post.pinned && <Pin size={16} className="ms-auto text-accent" />}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      </header>

      <RichText text={post.body} />

      <ReactionBar postId={post.id} reactions={reactions} />

      {(moderator || canDelete) && (
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm">
          {moderator && (
            <>
              <span className="me-1 text-xs text-muted">{t("community.moderate")}</span>
              <form action={togglePin.bind(null, post.id)}>
                <SubmitButton unstyled className={toolClass}>
                  {post.pinned ? <PinOff size={14} /> : <Pin size={14} />}{" "}
                  {post.pinned ? t("community.unpin") : t("community.pin")}
                </SubmitButton>
              </form>
              <form action={toggleLock.bind(null, post.id)}>
                <SubmitButton unstyled className={toolClass}>
                  {post.locked ? <LockOpen size={14} /> : <Lock size={14} />}{" "}
                  {post.locked ? t("community.unlock") : t("community.lockReplies")}
                </SubmitButton>
              </form>
            </>
          )}
          {canDelete && (
            <ConfirmForm
              action={deletePost.bind(null, post.id)}
              triggerClassName={clsx(toolClass, "hover:border-k-deadline hover:text-k-deadline")}
              trigger={
                <>
                  <Trash2 size={14} /> {t("community.delete")}
                </>
              }
              title={t("community.deletePostTitle")}
              description={t("community.deletePostDescription", { count: comments.length })}
              confirmLabel={t("community.deletePost")}
            />
          )}
        </div>
      )}

      <section className="mt-10 border-t border-line pt-8">
        <Label className="mb-5">{t("community.replies", { count: comments.length })}</Label>
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
              {(moderator || comment.authorId === user.id) && (
                <ConfirmForm
                  action={deleteComment.bind(null, comment.id)}
                  triggerLabel={t("community.deleteReply")}
                  triggerClassName="rounded-md p-1.5 text-muted hover:bg-k-deadline/10 hover:text-k-deadline"
                  trigger={<Trash2 size={13} />}
                  title={t("community.deleteReplyTitle")}
                  description={t("community.deleteReplyDescription")}
                  confirmLabel={t("community.deleteReply")}
                />
              )}
            </li>
          ))}
        </ol>
        <div className="mt-8">
          {post.locked ? (
            <p className="flex items-center gap-2 rounded-md border border-line bg-surface p-4 text-sm text-muted">
              <Lock size={14} /> {t("community.threadLocked")}
            </p>
          ) : (
            <CommentForm postId={post.id} />
          )}
        </div>
      </section>
    </article>
  );
}
