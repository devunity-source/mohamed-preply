"use client";

import { useState } from "react";
import { useFormAction } from "@/components/use-form-action";
import clsx from "clsx";
import { Check } from "lucide-react";
import type { FormState } from "@/lib/actions";
import type { RubricCriterion } from "@/lib/types";
import { Button } from "@/components/ui";

// Client-side form shells for the admin area. The server actions they call
// do all validation and permission checks; these only handle pending and
// error display.

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export const field =
  "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink disabled:opacity-60";

export function ActionForm({
  action,
  children,
  submitLabel,
  savedLabel = "Saved",
  className,
  resetOnSuccess,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel: string;
  savedLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const { state, pending, formProps } = useFormAction(action, { resetOnSuccess });
  return (
    <form {...formProps} className={clsx("space-y-3", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        {state.error && (
          <p role="alert" className="text-sm text-k-deadline">
            {state.error}
          </p>
        )}
        {state.ok && !pending && (
          <p className="flex items-center gap-1 text-sm text-k-office">
            <Check size={14} strokeWidth={3} /> {savedLabel}
          </p>
        )}
      </div>
    </form>
  );
}

export function GradeForm({
  action,
  submissionId,
  rubric,
  scores,
  feedback,
}: {
  action: Action;
  submissionId: string;
  rubric: RubricCriterion[];
  scores: Record<string, number> | null;
  feedback: string | null;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rubric.map((c) => [c.id, scores?.[c.id] != null ? String(scores[c.id]) : ""])),
  );
  const max = rubric.reduce((n, c) => n + c.points, 0);
  const earned = rubric.reduce((n, c) => n + (Number(values[c.id]) || 0), 0);
  const grade = max ? Math.round((earned / max) * 100) : 0;

  return (
    <ActionForm
      action={action}
      submitLabel={scores ? "Update grade" : "Save grade"}
      savedLabel="Graded, student notified"
    >
      <input type="hidden" name="submissionId" value={submissionId} />
      <div className="grid gap-2 sm:grid-cols-2">
        {rubric.map((c) => (
          <label key={c.id} className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-sm">
            <span className="flex-1">{c.label}</span>
            <input
              name={`score:${c.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={c.points}
              step={1}
              required
              value={values[c.id]}
              onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))}
              className="w-16 rounded-md border border-line bg-paper px-2 py-1 text-right font-mono outline-none focus:border-ink"
            />
            <span className="w-8 font-mono text-xs text-muted">/{c.points}</span>
          </label>
        ))}
      </div>
      <p className="font-mono text-sm">
        Grade: <span className="text-lg font-semibold">{grade}</span>/100
      </p>
      <textarea
        name="feedback"
        rows={3}
        required
        defaultValue={feedback ?? ""}
        placeholder="What worked, what to fix, one thing to try next."
        className={field}
      />
    </ActionForm>
  );
}
