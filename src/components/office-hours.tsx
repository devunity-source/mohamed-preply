"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { useFormAction } from "@/components/use-form-action";
import { Button } from "@/components/ui";
import { field } from "@/components/admin-forms";
import { markOfficeThreadRead, sendOfficeMessage } from "@/lib/actions";
import type { FormState } from "@/lib/actions";

/**
 * The student's message box. Outside office hours it's shown but greyed out
 * and disabled; the server refuses messages then too.
 */
export function OfficeMessageForm({
  cohortId,
  open,
  closedNote,
}: {
  cohortId: string;
  open: boolean;
  closedNote: string;
}) {
  const { state, pending, formProps } = useFormAction(sendOfficeMessage, { resetOnSuccess: true });
  return (
    <form {...formProps}>
      {/* A disabled fieldset turns off every control inside it, for mouse, keyboard and screen readers. */}
      <fieldset
        disabled={!open}
        className={clsx("space-y-3", !open && "cursor-not-allowed opacity-50 grayscale select-none")}
      >
        <input type="hidden" name="cohortId" value={cohortId} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Message your instructor</span>
          <textarea
            name="body"
            rows={4}
            required
            maxLength={2000}
            placeholder={open ? "What are you stuck on? Paste the error or the step you're on." : closedNote}
            className={field}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending}>{pending ? "Sending…" : "Send message"}</Button>
          {state.error && (
            <p role="alert" className="text-sm text-k-deadline">
              {state.error}
            </p>
          )}
          {state.ok && !pending && (
            <p role="status" className="flex items-center gap-1 text-sm text-k-office">
              <Check size={14} strokeWidth={3} /> Sent. You&apos;ll get a notification when they reply.
            </p>
          )}
        </div>
      </fieldset>
    </form>
  );
}

/** Staff reply box; replies are allowed any time. */
export function OfficeReplyForm({
  action,
  threadId,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  threadId: string;
}) {
  const { state, pending, formProps } = useFormAction(action, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="threadId" value={threadId} />
      <label className="block text-sm">
        <span className="sr-only">Reply</span>
        <textarea name="body" rows={3} required maxLength={2000} placeholder="Write a reply…" className={field} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? "Sending…" : "Send reply"}</Button>
        {state.error && (
          <p role="alert" className="text-sm text-k-deadline">
            {state.error}
          </p>
        )}
        {state.ok && !pending && (
          <p role="status" className="flex items-center gap-1 text-sm text-k-office">
            <Check size={14} strokeWidth={3} /> Sent. The student has been notified.
          </p>
        )}
      </div>
    </form>
  );
}

export function MarkThreadRead({ threadId }: { threadId: string }) {
  useEffect(() => {
    void markOfficeThreadRead(threadId);
  }, [threadId]);
  return null;
}
