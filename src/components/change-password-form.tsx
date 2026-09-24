"use client";

import { Check } from "lucide-react";
import { useFormAction } from "@/components/use-form-action";
import { Button } from "@/components/ui";
import { field } from "@/components/admin-forms";
import { changePassword } from "@/lib/auth-actions";

export function ChangePasswordForm() {
  const { state, pending, formProps } = useFormAction(changePassword, { resetOnSuccess: true });
  return (
    <form {...formProps} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Current password</span>
        <input name="current" type="password" autoComplete="current-password" required className={field} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">New password</span>
        <input name="next" type="password" autoComplete="new-password" minLength={10} required className={field} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">New password again</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={10} required className={field} />
      </label>
      <p className="text-xs text-muted">At least 10 characters. A short sentence works well.</p>
      <Button disabled={pending} className="w-full">
        {pending ? "Saving…" : "Change password"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-k-deadline">
          {state.error}
        </p>
      )}
      {state.ok && !pending && (
        <p role="status" className="flex items-center gap-1.5 text-sm text-k-office">
          <Check size={14} strokeWidth={3} /> Password changed. Other devices have been signed out.
        </p>
      )}
    </form>
  );
}
