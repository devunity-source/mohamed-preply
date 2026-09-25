"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { useFormAction } from "@/components/use-form-action";
import { Button } from "@/components/ui";
import { field } from "@/components/admin-forms";
import { markOfficeThreadRead, sendOfficeMessage } from "@/lib/actions";
import type { FormState } from "@/lib/actions";
import { useT } from "@/components/i18n-provider";

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
  const t = useT();
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
          <span className="mb-1 block font-medium">{t("officeHours.messageLabel")}</span>
          <textarea
            name="body"
            rows={4}
            required
            maxLength={2000}
            placeholder={open ? t("officeHours.messagePlaceholder") : closedNote}
            className={field}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending}>{pending ? t("officeHours.sending") : t("officeHours.sendMessage")}</Button>
          {state.error && (
            <p role="alert" className="text-sm text-k-deadline">
              {state.error}
            </p>
          )}
          {state.ok && !pending && (
            <p role="status" className="flex items-center gap-1 text-sm text-k-office">
              <Check size={14} strokeWidth={3} /> {t("officeHours.sent")}
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
  const t = useT();
  const { state, pending, formProps } = useFormAction(action, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="threadId" value={threadId} />
      <label className="block text-sm">
        <span className="sr-only">{t("officeHours.reply")}</span>
        <textarea
          name="body"
          rows={3}
          required
          maxLength={2000}
          placeholder={t("officeHours.replyPlaceholder")}
          className={field}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? t("officeHours.sending") : t("officeHours.sendReply")}</Button>
        {state.error && (
          <p role="alert" className="text-sm text-k-deadline">
            {state.error}
          </p>
        )}
        {state.ok && !pending && (
          <p role="status" className="flex items-center gap-1 text-sm text-k-office">
            <Check size={14} strokeWidth={3} /> {t("officeHours.replySent")}
          </p>
        )}
      </div>
    </form>
  );
}

/**
 * Marks the open conversation read. Keyed on the newest message as well as the
 * thread, so a reply that arrives while it's open is marked read too; skipped
 * when nothing is unread, so it doesn't refresh the page for nothing.
 */
export function MarkThreadRead({
  threadId,
  latestId,
  unread,
}: {
  threadId: string;
  latestId: string | undefined;
  unread: boolean;
}) {
  useEffect(() => {
    if (unread) void markOfficeThreadRead(threadId);
  }, [threadId, latestId, unread]);
  return null;
}
