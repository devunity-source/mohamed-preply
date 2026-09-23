"use client";

import { useFormAction } from "@/components/use-form-action";
import { Button } from "@/components/ui";
import { signIn } from "@/lib/auth-actions";

const field =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-ink disabled:opacity-60";

export function SignInForm({ next }: { next?: string }) {
  const { state, pending, formProps } = useFormAction(signIn);
  return (
    <form {...formProps} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" maxLength={254} className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          maxLength={200}
          className={field}
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-k-deadline">
          {state.error}
        </p>
      )}
      <Button disabled={pending} className="h-11 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
