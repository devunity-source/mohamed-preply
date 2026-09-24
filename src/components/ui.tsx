import Link from "next/link";
import clsx from "clsx";
import type { CalendarKind, Profile } from "@/lib/types";
import { translate, type Key, type T } from "@/lib/i18n/translate";
import { activeLocale } from "@/lib/time";

// Sync server components here read the request's language the way the date
// helpers do (set by the page's getI18n() call). Pass `t` to override.
const tr: T = (key, vars) => translate(activeLocale(), key, vars);

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <Label className="mb-2">{eyebrow}</Label>}
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("text-[13px] font-medium text-muted", className)}>{children}</p>;
}

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={clsx("rounded-md border border-line bg-surface p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <Label>{title}</Label>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";
export const buttonVariants = {
  primary: "bg-ink text-paper hover:bg-accent hover:text-accent-ink",
  accent: "bg-accent text-accent-ink hover:bg-ink hover:text-paper",
  ghost: "border border-line hover:border-ink",
  danger: "bg-k-deadline text-white hover:opacity-90",
};

export type ButtonVariant = keyof typeof buttonVariants;

export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  clsx(buttonBase, buttonVariants[variant], className);

export function ButtonLink({
  href,
  children,
  variant = "primary",
  external,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof buttonVariants;
  external?: boolean;
  className?: string;
}) {
  const cls = clsx(buttonBase, buttonVariants[variant], className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants }) {
  return <button className={clsx(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function ProgressBar({ value, segments = 20 }: { value: number; segments?: number }) {
  const filled = Math.round((value / 100) * segments);
  return (
    <div className="flex gap-[3px]" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={clsx("h-3 flex-1 rounded-[2px]", i < filled ? "bg-accent" : "bg-line")} />
      ))}
    </div>
  );
}

export function Avatar({ profile, size = 32 }: { profile: Profile; size?: number }) {
  const initials = profile.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md font-mono font-semibold text-white"
      style={{ width: size, height: size, background: profile.avatarColor, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** `label` is in the request's language (server); client code can use `t(labelKey)`. */
function kind(labelKey: Key, className: string) {
  return {
    labelKey,
    className,
    get label() {
      return tr(labelKey);
    },
  };
}

export const KIND_META: Record<CalendarKind, { label: string; labelKey: Key; className: string }> = {
  class: kind("common.kindClass", "bg-k-class"),
  lab: kind("common.kindLab", "bg-k-lab"),
  office_hours: kind("common.kindOfficeHours", "bg-k-office"),
  workshop: kind("common.kindWorkshop", "bg-k-workshop"),
  deadline: kind("common.kindDeadline", "bg-k-deadline"),
  event: kind("common.kindEvent", "bg-k-event"),
};

export function KindMark({ kind }: { kind: CalendarKind }) {
  return (
    <span className={clsx("inline-block size-2.5 shrink-0 rounded-[2px]", KIND_META[kind].className)} aria-hidden />
  );
}

/**
 * Colour means something. accent (orange) is reserved for "act now": live,
 * next up, due this week, waiting on you. Everything else is calmer: quiet
 * for not started, neutral for in flight, good/warn/bad for outcomes.
 */
export type PillTone = "quiet" | "neutral" | "accent" | "good" | "warn" | "bad";

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: PillTone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 font-mono text-[11px] font-medium tracking-wider uppercase",
        {
          quiet: "border border-line text-muted",
          neutral: "bg-line text-ink",
          accent: "bg-accent text-accent-ink",
          good: "bg-k-office/15 text-k-office",
          warn: "bg-k-workshop/15 text-k-workshop",
          bad: "bg-k-deadline/15 text-k-deadline",
        }[tone],
      )}
    >
      {children}
    </span>
  );
}

type Tally = { done: number; total: number };

/** What the progress % is made of. Every lesson, lab and assignment counts once. */
export function ProgressBreakdown({
  progress,
  className,
  t = tr,
}: {
  progress: { lessons: Tally; labs: Tally; assignments: Tally };
  className?: string;
  t?: T;
}) {
  const { lessons, labs, assignments } = progress;
  return (
    <p className={clsx("text-xs leading-relaxed text-muted", className)}>
      {t("common.progressBreakdown", {
        lessonsDone: lessons.done,
        lessonsTotal: lessons.total,
        labsDone: labs.done,
        labsTotal: labs.total,
        assignmentsDone: assignments.done,
        assignmentsTotal: assignments.total,
      })}
    </p>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="6" fill="currentColor" />
      <path d="M9 24 L16 8 L23 24 Z" fill="var(--paper)" />
      <rect x="20" y="20" width="6" height="6" fill="var(--accent)" />
    </svg>
  );
}

export function Legend({ className, t = tr }: { className?: string; t?: T }) {
  return (
    <ul
      className={clsx(
        "flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] tracking-wider text-muted uppercase",
        className,
      )}
    >
      {(Object.keys(KIND_META) as CalendarKind[]).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <KindMark kind={k} /> {t(KIND_META[k].labelKey)}
        </li>
      ))}
    </ul>
  );
}

/** Finished items, collapsed by default so current work stays on top. */
export function DoneGroup({
  label,
  count,
  children,
}: {
  /** Defaults to "Completed". */
  label?: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <details className="group rounded-md border border-dashed border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-medium text-muted hover:text-ink">
        <span>
          {label ?? tr("common.completed")} · {count}
        </span>
        <span
          className="font-mono text-xs transition-transform group-open:rotate-90 rtl:-scale-x-100 rtl:group-open:-rotate-90"
          aria-hidden
        >
          →
        </span>
      </summary>
      <div className="space-y-5 border-t border-dashed border-line p-4">{children}</div>
    </details>
  );
}
