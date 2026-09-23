"use client";

import { useActionState } from "react";
import { submitAssignment, type FormState } from "@/lib/actions";
import { Button } from "@/components/ui";

export function SubmitAssignment({
  assignmentId,
  defaultRepo,
  resubmit,
}: {
  assignmentId: string;
  defaultRepo?: string;
  resubmit: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitAssignment, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Repository URL</span>
        <input
          name="repoUrl"
          type="url"
          required
          defaultValue={defaultRepo}
          placeholder="https://github.com/you/landing-zone"
          className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Note for your instructor <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          name="note"
          rows={3}
          className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </label>
      {state.error && <p className="text-sm text-k-deadline">{state.error}</p>}
      {state.ok && <p className="text-sm text-k-office">Submitted. Your instructor has been notified.</p>}
      <Button disabled={pending}>
        {pending ? "Submitting…" : resubmit ? "Update submission" : "Submit assignment"}
      </Button>
      <p className="text-xs text-muted">ZIP uploads arrive with file storage in Phase 2.</p>
    </form>
  );
}
