"use client";

import { useState } from "react";
import { useFormAction } from "@/components/use-form-action";
import { addComment, createPost } from "@/lib/actions";
import { Button } from "@/components/ui";

const field = "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink";

export function NewPostForm({ space, spaceName }: { space: string; spaceName: string }) {
  const [open, setOpen] = useState(false);
  const { state, pending, formProps } = useFormAction(createPost);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-line bg-surface px-4 py-3 text-left text-sm text-muted hover:border-ink"
      >
        Start a discussion in {spaceName}…
      </button>
    );
  }

  return (
    <form {...formProps} className="space-y-3 rounded-md border border-ink bg-surface p-4">
      <input type="hidden" name="space" value={space} />
      <input name="title" required maxLength={140} placeholder="Title" className={`${field} font-medium`} autoFocus />
      <textarea
        name="body"
        required
        rows={5}
        placeholder="Write something. Use @handle to mention someone."
        className={field}
      />
      {state.error && <p className="text-sm text-k-deadline">{state.error}</p>}
      <div className="flex gap-2">
        <Button disabled={pending}>{pending ? "Posting…" : "Post"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const { state, pending, formProps } = useFormAction(addComment, { resetOnSuccess: true });

  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="postId" value={postId} />
      <textarea name="body" required rows={3} placeholder="Write a reply…" className={field} />
      {state.error && <p className="text-sm text-k-deadline">{state.error}</p>}
      <Button disabled={pending}>{pending ? "Replying…" : "Reply"}</Button>
    </form>
  );
}
