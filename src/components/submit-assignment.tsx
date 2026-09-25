"use client";

import { useFormAction } from "@/components/use-form-action";
import { submitAssignment } from "@/lib/actions";
import { Button } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { rich } from "@/components/rich";

export function SubmitAssignment({
  assignmentId,
  defaultRepo,
  resubmit,
}: {
  assignmentId: string;
  defaultRepo?: string;
  resubmit: boolean;
}) {
  const t = useT();
  const { state, pending, formProps } = useFormAction(submitAssignment);
  return (
    <form {...formProps} className="space-y-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("assignments.repoUrl")}</span>
        <input
          name="repoUrl"
          type="url"
          dir="ltr"
          required
          defaultValue={defaultRepo}
          placeholder="https://github.com/you/landing-zone"
          className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          {rich(t("assignments.note"), {
            muted: (c) => <span className="font-normal text-muted">{c}</span>,
          })}
        </span>
        <textarea
          name="note"
          rows={3}
          className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-k-deadline">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-k-office">
          {t("assignments.submittedOk")}
        </p>
      )}
      <Button disabled={pending}>
        {pending ? t("assignments.submitting") : resubmit ? t("assignments.update") : t("assignments.submit")}
      </Button>
      <p className="text-xs text-muted">{t("assignments.zipNote")}</p>
    </form>
  );
}
