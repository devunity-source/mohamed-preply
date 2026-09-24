"use client";

import { Check } from "lucide-react";
import { useFormAction } from "@/components/use-form-action";
import { Button } from "@/components/ui";
import { saveEmailPrefs } from "@/lib/actions";

export function EmailSettingsForm({
  kinds,
  off,
}: {
  kinds: { kind: string; label: string; hint: string }[];
  off: string[];
}) {
  const { state, pending, formProps } = useFormAction(saveEmailPrefs);
  return (
    <form {...formProps} className="space-y-3">
      {kinds.map((k) => (
        <label key={k.kind} className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name={`on:${k.kind}`}
            defaultChecked={!off.includes(k.kind)}
            className="mt-0.5 size-4 accent-ink"
          />
          <span>
            <span className="block font-medium">{k.label}</span>
            <span className="block text-xs text-muted">{k.hint}</span>
          </span>
        </label>
      ))}
      <p className="text-xs text-muted">Emails about joining or teaching a cohort always go out.</p>
      <Button disabled={pending} variant="ghost" className="w-full">
        {pending ? "Saving…" : "Save email settings"}
      </Button>
      {state.ok && !pending && (
        <p role="status" className="flex items-center gap-1.5 text-sm text-k-office">
          <Check size={14} strokeWidth={3} /> Saved.
        </p>
      )}
    </form>
  );
}
