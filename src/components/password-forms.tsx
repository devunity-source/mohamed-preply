"use client";

import { Check } from "lucide-react";
import { useFormAction } from "@/components/use-form-action";
import { Button } from "@/components/ui";
import { requestPasswordReset, setNewPassword } from "@/lib/auth-actions";

const field =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-ink disabled:opacity-60";

function Problem({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className="text-sm text-k-deadline">
      {error}
    </p>
  ) : null;
}

export function ForgotPasswordForm() {
  const { state, pending, formProps } = useFormAction(requestPasswordReset);
  if (state.ok) {
    return (
      <p role="status" className="flex gap-2 rounded-md border border-line p-4 text-sm">
        <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-k-office" />
        {state.message}
      </p>
    );
  }
  return (
    <form {...formProps} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" maxLength={254} className={field} />
      </label>
      <Problem error={state.error} />
      <Button disabled={pending} className="h-11 w-full">
        {pending ? "Sending…" : "Email me a reset link"}
      </Button>
    </form>
  );
}

export function SetPasswordForm() {
  const { state, pending, formProps } = useFormAction(setNewPassword);
  return (
    <form {...formProps} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">New password</span>
        <input name="next" type="password" autoComplete="new-password" minLength={10} required className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">New password again</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={10} required className={field} />
      </label>
      <p className="text-xs text-muted">At least 10 characters. A short sentence works well.</p>
      <Problem error={state.error} />
      <Button disabled={pending} className="h-11 w-full">
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
