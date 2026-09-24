"use client";

import { useFormAction } from "@/components/use-form-action";
import { Button } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { signIn } from "@/lib/auth-actions";

const field =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-ink disabled:opacity-60";

export function SignInForm({ next }: { next?: string }) {
  const { state, pending, formProps } = useFormAction(signIn);
  const t = useT();
  return (
    <form {...formProps} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("auth.email")}</span>
        <input name="email" type="email" required autoComplete="email" maxLength={254} dir="ltr" className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("auth.password")}</span>
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
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
    </form>
  );
}
