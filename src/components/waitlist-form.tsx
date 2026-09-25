"use client";

import { useId } from "react";
import { useFormAction } from "@/components/use-form-action";
import { Check } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { joinWaitlist } from "@/lib/actions";

/** Email plus a programme picked from cards, as one card. */
export function WaitlistForm({
  programmes,
  defaultProgramme,
}: {
  programmes: { slug: string; title: string; price: string }[];
  defaultProgramme?: string;
}) {
  const { state, pending, formProps } = useFormAction(joinWaitlist);
  const t = useT();
  const id = useId();
  const chosen = defaultProgramme ?? programmes[0]?.slug;

  if (state.ok) {
    return (
      <p
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-6 font-medium sm:p-8"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Check size={16} strokeWidth={3} />
        </span>
        {t("landing.formJoined")}
      </p>
    );
  }

  return (
    <form {...formProps} className="rounded-2xl border border-line bg-surface p-6 text-start sm:p-8">
      <label htmlFor={`${id}-email`} className="mb-2 block text-sm font-medium text-ink/80">
        {t("landing.formEmail")}
      </label>
      <input
        id={`${id}-email`}
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        dir="ltr"
        placeholder="you@email.com"
        className="w-full rounded-xl border border-line bg-ink/5 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted focus:border-accent"
      />

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-ink/80">{t("landing.formProgramme")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {programmes.map((p) => (
            <label key={p.slug} className="relative cursor-pointer">
              <input
                type="radio"
                name="programme"
                value={p.slug}
                defaultChecked={p.slug === chosen}
                className="peer sr-only"
              />
              <span className="block rounded-xl border border-line bg-ink/[0.02] p-4 transition-colors peer-checked:border-violet peer-checked:bg-violet/10 peer-focus-visible:outline-2 peer-focus-visible:outline-accent hover:border-ink/20">
                <span className="block text-sm font-bold">{p.title}</span>
                <span className="mt-1 block text-sm text-muted">{p.price}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <button
        disabled={pending}
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/20 transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? t("landing.formJoining") : t("landing.joinWaitlist")}
      </button>
      {state.error ? (
        <p role="alert" className="mt-3 text-center text-sm text-k-deadline">
          {state.error}
        </p>
      ) : (
        <p className="mt-3 text-center text-xs text-muted">{t("landing.formNoSpam")}</p>
      )}
    </form>
  );
}
