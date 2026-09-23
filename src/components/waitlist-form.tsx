"use client";

import { useActionState, useId } from "react";
import clsx from "clsx";
import { ArrowRight, Check } from "lucide-react";
import { joinWaitlist, type FormState } from "@/lib/actions";

export function WaitlistForm({
  programmes,
  defaultProgramme,
  tone = "light",
}: {
  programmes: { slug: string; title: string }[];
  defaultProgramme?: string;
  tone?: "light" | "dark";
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(joinWaitlist, {});
  const id = useId();
  const dark = tone === "dark";
  const field = clsx(
    "h-12 rounded-md border px-4 text-base outline-none transition-colors",
    dark
      ? "border-paper/25 bg-transparent text-paper placeholder:text-paper/50 focus:border-paper"
      : "border-line bg-surface text-ink placeholder:text-muted focus:border-ink",
  );

  if (state.ok) {
    return (
      <p
        role="status"
        className={clsx(
          "flex items-center gap-3 rounded-md px-4 py-3.5 font-medium",
          dark ? "bg-paper text-ink" : "bg-ink text-paper",
        )}
      >
        <Check size={18} strokeWidth={3} className="shrink-0 text-accent" />
        You&apos;re on the list. We&apos;ll email you before enrolment opens.
      </p>
    );
  }

  return (
    <form action={action} className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@email.com"
          className={clsx(field, "w-full min-w-0 sm:flex-1")}
        />
        <label htmlFor={`${id}-programme`} className="sr-only">
          Programme
        </label>
        <select
          id={`${id}-programme`}
          name="programme"
          defaultValue={defaultProgramme ?? programmes[0]?.slug}
          className={clsx(field, "pr-8", dark && "[&>option]:text-ink")}
        >
          {programmes.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
        {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          disabled={pending}
          className={clsx(
            "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md px-5 font-medium transition-colors disabled:opacity-60",
            dark
              ? "bg-accent text-accent-ink hover:bg-paper hover:text-ink"
              : "bg-ink text-paper hover:bg-accent hover:text-accent-ink",
          )}
        >
          {pending ? "Joining…" : "Join the waitlist"}
          {!pending && <ArrowRight size={16} />}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className={clsx("mt-2 text-sm", dark ? "text-accent" : "text-k-deadline")}>
          {state.error}
        </p>
      ) : (
        <p className={clsx("mt-2 text-xs", dark ? "text-paper/60" : "text-muted")}>
          We only email you about cohorts. No spam, unsubscribe any time.
        </p>
      )}
    </form>
  );
}
