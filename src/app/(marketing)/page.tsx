import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Clock,
  Code,
  FlaskConical,
  MessageSquareText,
  Rocket,
  Users,
  Video,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { WaitlistForm } from "@/components/waitlist-form";
import { demoLoginEnabled } from "@/lib/auth/config";
import { cohortRoster, publishedProgrammes, modulesFor, nextCohortFor } from "@/lib/data/repo";
import { loadData } from "@/lib/data/store";
import { formatMoney } from "@/lib/format";
import { ACADEMY_TZ, formatDate } from "@/lib/time";
import { rich } from "@/components/rich";
import { loc } from "@/lib/i18n/content";
import { getI18n } from "@/lib/i18n/server";
import type { Key } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import type { CalendarKind } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { absolute: t("landing.metaTitle") },
    description: t("landing.metaDescription"),
    openGraph: {
      title: t("landing.ogTitle"),
      description: t("landing.ogDescription"),
      type: "website",
    },
  };
}

const TZ_CITY = (ACADEMY_TZ.split("/").pop() ?? ACADEMY_TZ).replaceAll("_", " ");
// The academy's city in Arabic, for the time zones it's likely to run in.
const AR_CITY: Record<string, string> = {
  Dubai: "دبي",
  Riyadh: "الرياض",
  Cairo: "القاهرة",
  Amman: "عمّان",
  Qatar: "الدوحة",
  Kuwait: "الكويت",
  Bahrain: "البحرين",
  Muscat: "مسقط",
  Beirut: "بيروت",
  Baghdad: "بغداد",
  Casablanca: "الدار البيضاء",
  London: "لندن",
};
const cityFor = (locale: Locale) => (locale === "ar" ? (AR_CITY[TZ_CITY] ?? TZ_CITY) : TZ_CITY);

const FEATURES = [
  { icon: Video, title: "landing.incLiveTitle", body: "landing.incLiveBody" },
  { icon: FlaskConical, title: "landing.incLabsTitle", body: "landing.incLabsBody" },
  { icon: MessageSquareText, title: "landing.incFeedbackTitle", body: "landing.incFeedbackBody" },
  { icon: Rocket, title: "landing.incCapstoneTitle", body: "landing.incCapstoneBody" },
  { icon: Users, title: "landing.incCohortTitle", body: "landing.incCohortBody" },
  { icon: Clock, title: "landing.incOfficeHoursTitle", body: "landing.incOfficeHoursBody" },
] as const;

const OUTCOMES = [
  { title: "landing.outGithubTitle", body: "landing.outGithubBody" },
  { title: "landing.outCapstoneTitle", body: "landing.outCapstoneBody" },
  { title: "landing.outCertificateTitle", body: "landing.outCertificateBody" },
  { title: "landing.outNetworkTitle", body: "landing.outNetworkBody" },
] as const;

// Mirrors the cohort calendar in the app, so the page promises what the timetable delivers.
const WEEK: { day: Key; kind: CalendarKind; what: Key; from: string; to: string }[] = [
  { day: "landing.monday", kind: "class", what: "landing.weekLiveClass", from: "19:00", to: "20:30" },
  { day: "landing.tuesday", kind: "lab", what: "landing.weekLab", from: "19:00", to: "20:30" },
  { day: "landing.wednesday", kind: "office_hours", what: "landing.weekOfficeHours", from: "18:00", to: "19:00" },
  { day: "landing.thursday", kind: "class", what: "landing.weekLiveClass", from: "19:00", to: "20:30" },
  { day: "landing.friday", kind: "workshop", what: "landing.weekProject", from: "17:00", to: "19:00" },
];
const CLASSES_PER_WEEK = WEEK.filter((d) => d.kind === "class").length;

const KIND_TEXT: Record<string, string> = {
  class: "text-k-class",
  lab: "text-k-lab",
  office_hours: "text-k-office",
  workshop: "text-k-workshop",
};

const FAQ = [
  { q: "landing.faqExperienceQ", a: "landing.faqExperienceA" },
  { q: "landing.faqTimeQ", a: "landing.faqTimeA" },
  { q: "landing.faqMissQ", a: "landing.faqMissA" },
  { q: "landing.faqWaitlistQ", a: "landing.faqWaitlistA" },
  { q: "landing.faqCertificateQ", a: "landing.faqCertificateA" },
] as const;

const gradientWords = { g: (c: React.ReactNode) => <span className="text-brand">{c}</span> };

export default async function Landing({ searchParams }: PageProps<"/">) {
  const { t, locale } = await getI18n();
  await loadData();
  const sp = await searchParams;
  const city = cityFor(locale);
  const programmes = publishedProgrammes().map((p) => {
    const modules = modulesFor(p.id).map(({ module, lessons }) => ({
      ...loc(module, locale),
      lessons: lessons.map((l) => loc(l, locale).title),
    }));
    return { ...loc(p, locale), cohort: nextCohortFor(p.id), modules };
  });
  if (programmes.length === 0) return null;

  // The programme whose cohort starts first; it's the default tab and gets the "starts next" badge.
  const upcoming = programmes
    .filter((p) => p.cohort?.status === "upcoming")
    .sort((a, b) => a.cohort!.startsOn.getTime() - b.cohort!.startsOn.getTime())[0];
  const requested = typeof sp.programme === "string" ? sp.programme : undefined;
  const p = programmes.find((x) => x.slug === requested) ?? upcoming ?? programmes[0];
  const instructor = p.cohort ? cohortRoster(p.cohort.id).instructors[0] : undefined;
  const lessonCount = p.modules.reduce((n, m) => n + m.lessons.length, 0);
  const starts = p.cohort?.status === "upcoming" ? p.cohort.startsOn : undefined;

  const numbers = [
    { value: p.durationWeeks, label: t("landing.numWeeks") },
    { value: p.durationWeeks * CLASSES_PER_WEEK, label: t("landing.numClasses") },
    { value: lessonCount, label: t("landing.numLessons") },
    { value: 1, label: t("landing.numCapstone") },
  ];

  return (
    <>
      {programmes.length > 1 && (
        <div className="relative z-30 flex justify-center px-4 pt-2 md:pointer-events-none md:fixed md:inset-x-0 md:top-4 md:pt-0">
          <nav
            aria-label={t("landing.tabsLabel")}
            className="flex gap-1 rounded-full border border-neutral-200/50 bg-white/90 p-1.5 font-sans shadow-lg backdrop-blur-md md:pointer-events-auto"
          >
            {programmes.map((x) => (
              <Link
                key={x.slug}
                href={`/?programme=${x.slug}`}
                scroll={false}
                aria-current={x.slug === p.slug ? "page" : undefined}
                className={clsx(
                  "rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-6",
                  x.slug === p.slug ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900",
                )}
              >
                {x.title}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Hero */}
      <section className="relative -mt-16 overflow-hidden pt-32 pb-28 md:-mt-20 md:pt-52 md:pb-40">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_60%,transparent_100%)] bg-[size:4rem_4rem]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 left-1/2 size-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#7c3aed,transparent)] opacity-20 blur-[80px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/4 right-1/4 size-[280px] rounded-full bg-[radial-gradient(circle,#22d3ee,transparent)] opacity-15 blur-[70px]"
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center md:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-ink/5 px-4 py-1.5 text-sm backdrop-blur-sm sm:text-base">
            <Rocket size={14} className="text-cyan" aria-hidden />
            {starts ? t("landing.nextCohortStarts", { date: formatDate(starts) }) : t("landing.cohortRunning")}
          </p>
          <h1 className="mx-auto mt-8 max-w-6xl text-5xl leading-[1.05] font-bold tracking-[-0.025em] sm:text-6xl lg:text-[88px]">
            {t("landing.heroTitle", { title: p.title })}
            <br />
            {rich(t("landing.heroTitleEnd"), gradientWords)}
          </h1>
          <p className="mt-8 text-lg text-muted md:text-xl">{t("landing.heroKicker")}</p>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink/80 md:text-xl">
            {t("landing.heroLead", { city })}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={`/?programme=${p.slug}#waitlist`}
              scroll={false}
              className="flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-lg font-bold text-slate-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-100"
            >
              {t("landing.joinWaitlist")}
              <ArrowRight size={18} className="rtl:-scale-x-100" aria-hidden />
            </Link>
            <Link
              href="#curriculum"
              className="rounded-lg border border-line bg-ink/5 px-8 py-4 text-lg font-medium backdrop-blur-sm transition-all hover:bg-ink/10"
            >
              {t("landing.viewCurriculum")}
            </Link>
          </div>
        </div>
        <p className="absolute start-12 bottom-16 hidden rounded-xl border border-line bg-ink/5 px-4 py-3 font-mono text-sm text-ink/80 backdrop-blur-sm lg:block">
          <span className="text-cyan">$ </span>
          {t("landing.chipClasses")} <span className="text-emerald-400">✓ {t("landing.chipClassesValue")}</span>
        </p>
        <p className="absolute end-12 bottom-16 hidden rounded-xl border border-line bg-ink/5 px-4 py-3 font-mono text-sm text-ink/80 backdrop-blur-sm lg:block">
          <span className="text-violet-400">$ </span>
          {t("landing.chipCapstone")}{" "}
          <span className="text-emerald-400">{t("landing.chipCapstoneValue", { week: p.durationWeeks })}</span>
        </p>
      </section>

      {/* Who it's for */}
      <Section>
        <SectionHeading kicker={t("landing.whoKicker")} title={t("landing.whoTitle")} />
        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {[
            { icon: BriefcaseBusiness, title: t("landing.whoSwitchTitle"), body: t("landing.whoSwitchBody") },
            { icon: Code, title: t("landing.whoLevelTitle"), body: t("landing.whoLevelBody") },
          ].map((w) => (
            <GlassCard key={w.title}>
              <IconBox icon={w.icon} />
              <h3 className="text-xl font-bold">{w.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{w.body}</p>
            </GlassCard>
          ))}
        </div>
      </Section>

      {/* What's included */}
      <Section>
        <SectionHeading
          title={t("landing.featuresTitle")}
          lead={
            <>
              {rich(t("landing.contrastOthersBody"), {
                s: (c) => <span className="line-through decoration-2">{c}</span>,
              })}{" "}
              {t("landing.contrastUs")}
            </>
          }
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <GlassCard key={f.title} className={clsx(i === 0 && "md:col-span-2")}>
              <IconBox icon={f.icon} />
              <h3 className="text-xl font-bold">{t(f.title)}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{t(f.body)}</p>
            </GlassCard>
          ))}
        </div>
      </Section>

      {/* Roadmap: the modules week by week */}
      <Section id="curriculum">
        <SectionHeading
          kicker={t("landing.roadmapKicker")}
          title={t("landing.roadmapTitle", { count: p.durationWeeks })}
          lead={t("landing.roadmapLead")}
        />
        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {p.modules.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-surface p-6">
              <p className="text-5xl font-bold text-ink/10 tabular-nums" aria-hidden>
                {String(m.week).padStart(2, "0")}
              </p>
              <p className="mt-3 text-xs font-bold tracking-[0.2em] text-cyan uppercase">
                {t("landing.roadmapWeek", { week: m.week })}
              </p>
              <h3 className="mt-2 text-lg font-bold">{m.title}</h3>
              {m.lessons.length > 0 && (
                <ul className="mt-4 space-y-2 text-[15px] text-muted">
                  {m.lessons.map((l) => (
                    <li key={l} className="flex gap-2">
                      <span className="mt-2.5 size-1 shrink-0 rounded-full bg-violet-400" aria-hidden />
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Section>

      {/* A week, as a terminal */}
      <Section id="week" tinted>
        <SectionHeading
          kicker={t("landing.weekKicker")}
          title={t("landing.weekTitle")}
          lead={t("landing.weekLead", { city })}
        />
        <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-xl border border-line bg-dusk shadow-2xl">
          <div className="flex items-center gap-2 border-b border-line bg-ink/5 px-4 py-3">
            <span className="size-3 rounded-full bg-[#ff5f57]" aria-hidden />
            <span className="size-3 rounded-full bg-[#febc2e]" aria-hidden />
            <span className="size-3 rounded-full bg-[#28c840]" aria-hidden />
            <span className="flex-1 text-center font-mono text-xs text-muted" dir="ltr">
              {t("landing.terminalTitle")}
            </span>
          </div>
          <div className="p-5 font-mono text-sm leading-7 sm:p-6">
            <p dir="ltr" className="text-start text-ink/80">
              <span className="text-cyan">~ $ </span>
              {t("landing.terminalCommand")}
            </p>
            <ol className="mt-2">
              {WEEK.map((d) => (
                <li key={d.day} className="grid grid-cols-[7rem_1fr] gap-x-4 sm:grid-cols-[8rem_1fr_auto]">
                  <span className="text-ink/60">{t(d.day)}</span>
                  <span className={KIND_TEXT[d.kind]}>{t(d.what)}</span>
                  <span className="col-start-2 text-ink/80 tabular-nums sm:col-start-auto">
                    {t("landing.timeRange", { from: d.from, to: d.to })}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-muted">
              # {t("landing.terminalDue")}
              <span className="ms-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-ink/70" aria-hidden />
            </p>
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section id="programmes">
        <SectionHeading
          kicker={t("landing.pricingKicker")}
          title={t("landing.pricingTitle")}
          lead={t("landing.pricingLead")}
        />
        <div
          className={clsx(
            "mx-auto mt-14 grid gap-6 md:items-start",
            programmes.length === 1
              ? "max-w-md"
              : programmes.length === 2
                ? "max-w-4xl md:grid-cols-2"
                : "md:grid-cols-3",
          )}
        >
          {programmes.map((x) => {
            const on = x.slug === p.slug;
            return (
              <article
                key={x.id}
                className={clsx(
                  "relative flex flex-col rounded-2xl border p-8",
                  on ? "border-violet/60 bg-violet/[0.08] shadow-xl shadow-violet/10" : "border-line bg-surface",
                )}
              >
                {x.slug === upcoming?.slug && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-bold whitespace-nowrap text-white">
                    {t("landing.startsNext")}
                  </span>
                )}
                <h3 className="text-xl font-bold">{x.title}</h3>
                <p className="mt-3 text-4xl font-bold tracking-tight">{formatMoney(x.priceCents, x.currency)}</p>
                <p className="mt-1 text-xs text-muted">
                  {t("landing.oneTime")} · {t("landing.weeksLive", { count: x.durationWeeks })}
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-muted">{x.tagline}</p>
                <ul className="mt-6 space-y-3 text-[15px]">
                  {x.includes.map((inc) => (
                    <li key={inc} className="flex items-start gap-3">
                      <span
                        className={clsx(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                          on ? "bg-violet/30 text-violet-300" : "bg-ink/10 text-muted",
                        )}
                        aria-hidden
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className={on ? "text-ink" : "text-ink/80"}>{inc}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 font-mono text-xs text-ink/70">
                  {x.cohort?.status === "upcoming"
                    ? t("landing.nextCohortStarts", { date: formatDate(x.cohort.startsOn) })
                    : t("landing.cohortRunning")}
                </p>
                <Link
                  href={`/?programme=${x.slug}#waitlist`}
                  scroll={false}
                  className={clsx(
                    "mt-6 rounded-xl py-3.5 text-center text-sm font-bold transition-all",
                    on
                      ? "bg-brand text-white shadow-lg shadow-violet/20 hover:opacity-90"
                      : "border border-line bg-ink/5 hover:bg-ink/10",
                  )}
                >
                  {t("landing.joinWaitlist")}
                </Link>
              </article>
            );
          })}
        </div>
      </Section>

      {/* By the numbers: all counted from the programme itself */}
      <Section tinted>
        <SectionHeading kicker={t("landing.numbersKicker")} title={t("landing.numbersTitle")} />
        <dl className="mt-14 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {numbers.map((n) => (
            <div key={n.label} className="rounded-2xl border border-line bg-surface p-6 text-center md:p-8">
              <dd className="text-brand text-4xl font-bold tabular-nums md:text-5xl">{n.value}</dd>
              <dt className="mt-3 text-sm text-muted">{n.label}</dt>
            </div>
          ))}
        </dl>
      </Section>

      {/* Instructor and outcomes */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          {instructor && (
            <GlassCard>
              <p className="mb-6 text-xs font-bold tracking-[0.2em] text-cyan uppercase">{t("landing.taughtBy")}</p>
              <div className="flex items-center gap-5">
                <Avatar profile={instructor} size={72} />
                <div>
                  <p className="text-2xl font-bold">{instructor.fullName}</p>
                  <p className="text-muted">{instructor.headline}</p>
                </div>
              </div>
              <p className="mt-6 text-[15px] leading-relaxed text-muted">{t("landing.taughtByBody")}</p>
            </GlassCard>
          )}
          <GlassCard className={clsx(!instructor && "lg:col-span-2")}>
            <p className="mb-2 text-xs font-bold tracking-[0.2em] text-cyan uppercase">{t("landing.outcomesKicker")}</p>
            <dl>
              {OUTCOMES.map((o) => (
                <div key={o.title} className="border-b border-line py-4 last:border-b-0">
                  <dt className="font-bold">{t(o.title)}</dt>
                  <dd className="mt-1 text-[15px] text-muted">{t(o.body)}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq">
        <SectionHeading kicker={t("landing.faqKicker")} title={t("landing.faqTitle")} />
        <div className="mx-auto mt-14 max-w-3xl space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-line bg-surface px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {t(q)}
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{t(a)}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Waitlist form */}
      <Section id="waitlist" tinted>
        <SectionHeading kicker={t("landing.formKicker")} title={t("landing.formTitle")} lead={t("landing.ctaBody")} />
        <div className="mx-auto mt-12 max-w-xl">
          <WaitlistForm
            key={p.slug}
            programmes={programmes.map((x) => ({
              slug: x.slug,
              title: x.title,
              price: formatMoney(x.priceCents, x.currency),
            }))}
            defaultProgramme={p.slug}
          />
        </div>
      </Section>

      {/* Final call to action */}
      <section className="relative overflow-hidden border-t border-line py-28 md:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[900px] -translate-x-1/2 translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,#7c3aed,transparent)] opacity-25 blur-[80px]"
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center md:px-8">
          <h2 className="text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl">
            {rich(t("landing.finalTitle"), gradientWords)}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            {starts ? t("landing.finalStarts", { date: formatDate(starts) }) : t("landing.ctaBody")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={`/?programme=${p.slug}#waitlist`}
              scroll={false}
              className="flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-lg font-bold text-slate-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-100"
            >
              {t("landing.joinWaitlist")}
              <ArrowRight size={18} className="rtl:-scale-x-100" aria-hidden />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-line bg-ink/5 px-8 py-4 text-lg font-medium transition-all hover:bg-ink/10"
            >
              {demoLoginEnabled() ? t("landing.exploreDemo") : t("nav.signIn")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Section({ id, tinted, children }: { id?: string; tinted?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={clsx("scroll-mt-24 border-t border-line py-24 md:py-28", tinted && "bg-black/20")}>
      <div className="mx-auto max-w-7xl px-4 md:px-8">{children}</div>
    </section>
  );
}

function SectionHeading({ kicker, title, lead }: { kicker?: string; title: string; lead?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {kicker && <p className="mb-4 text-sm font-bold tracking-[0.2em] text-cyan uppercase">{kicker}</p>}
      <h2 className="text-4xl leading-tight font-bold md:text-5xl">{title}</h2>
      {lead && <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}

/** The reference's card: faint glass with a violet wash at the top. */
function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-line bg-surface p-8 transition-colors hover:border-ink/20",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet/10 via-transparent to-transparent"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function IconBox({ icon: Icon }: { icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <span className="mb-6 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet/30 to-cyan/20 text-cyan">
      <Icon size={22} />
    </span>
  );
}
