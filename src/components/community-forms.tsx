"use client";

import { useState } from "react";
import { useFormAction } from "@/components/use-form-action";
import { addComment, createPost } from "@/lib/actions";
import { Button } from "@/components/ui";
import { useT } from "@/components/i18n-provider";

const field = "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink";

export function NewPostForm({ space, spaceName }: { space: string; spaceName: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { state, pending, formProps } = useFormAction(createPost);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-line bg-surface px-4 py-3 text-start text-sm text-muted hover:border-ink"
      >
        {t("community.startDiscussion", { space: spaceName })}
      </button>
    );
  }

  return (
    <form {...formProps} className="space-y-3 rounded-md border border-ink bg-surface p-4">
      <input type="hidden" name="space" value={space} />
      <input
        name="title"
        required
        maxLength={140}
        placeholder={t("community.titlePlaceholder")}
        className={`${field} font-medium`}
        autoFocus
      />
      <textarea name="body" required rows={5} placeholder={t("community.bodyPlaceholder")} className={field} />
      {state.error && <p className="text-sm text-k-deadline">{state.error}</p>}
      <div className="flex gap-2">
        <Button disabled={pending}>{pending ? t("community.posting") : t("community.post")}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const t = useT();
  const { state, pending, formProps } = useFormAction(addComment, { resetOnSuccess: true });

  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="postId" value={postId} />
      <textarea name="body" required rows={3} placeholder={t("community.replyPlaceholder")} className={field} />
      {state.error && <p className="text-sm text-k-deadline">{state.error}</p>}
      <Button disabled={pending}>{pending ? t("community.replying") : t("community.reply")}</Button>
    </form>
  );
}
