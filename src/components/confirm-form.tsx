"use client";

import { useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/components/i18n-provider";

/**
 * A destructive action behind a real confirmation. Uses the native <dialog>:
 * focus is trapped, Esc cancels, and Cancel gets focus first so Enter can't
 * delete by accident. The dialog stays open with a spinner until the server
 * finishes, then closes itself.
 */
export function ConfirmForm({
  action,
  trigger,
  triggerLabel,
  triggerClassName,
  title,
  description,
  confirmLabel,
}: {
  action: () => Promise<void>;
  trigger: React.ReactNode;
  triggerLabel?: string;
  triggerClassName: string;
  title: string;
  description?: string;
  confirmLabel: string;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <form action={action}>
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        className={triggerClassName}
        onClick={() => ref.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[min(92vw,420px)] rounded-md border border-line bg-surface p-6 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => ref.current?.close()}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-ink"
          >
            {t("common.cancel")}
          </button>
          <SubmitButton variant="danger" pendingLabel={t("common.working")}>
            {confirmLabel}
          </SubmitButton>
        </div>
        <CloseWhenDone dialog={ref} />
      </dialog>
    </form>
  );
}

function CloseWhenDone({ dialog }: { dialog: React.RefObject<HTMLDialogElement | null> }) {
  const { pending } = useFormStatus();
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending) dialog.current?.close();
    was.current = pending;
  }, [pending, dialog]);
  return null;
}
