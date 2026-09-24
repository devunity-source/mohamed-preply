import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Avatar } from "@/components/ui";
import { WaitlistForm } from "@/components/waitlist-form";
import { demoLoginEnabled } from "@/lib/auth/config";
import { cohortRoster, publishedProgrammes, modulesFor, nextCohortFor } from "@/lib/data/repo";
import { loadData } from "@/lib/data/store";
import { formatMoney } from "@/lib/format";
import { ACADEMY_TZ, formatDate, formatShortDate } from "@/lib/time";
import { rich } from "@/components/rich";
import { loc } from "@/lib/i18n/content";
import { getI18n } from "@/lib/i18n/server";
import type { Key, T } from "@/lib/i18n/translate";
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

const INCLUDED = [
  { title: "landing.incLiveTitle", body: "landing.incLiveBody" },
  { title: "landing.incLabsTitle", body: "landing.incLabsBody" },
  { title: "landing.incFeedbackTitle", body: "landing.incFeedbackBody" },
  { title: "landing.incCapstoneTitle", body: "landing.incCapstoneBody" },
  { title: "landing.incCohortTitle", body: "landing.incCohortBody" },
  { title: "landing.incOfficeHoursTitle", body: "landing.incOfficeHoursBody" },
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

const KIND_BAR: Record<string, string> = {
  class: "bg-k-class",
  lab: "bg-k-lab",
  office_hours: "bg-k-office",
  workshop: "bg-k-workshop",
};

const FAQ = [
  { q: "landing.faqExperienceQ", a: "landing.faqExperienceA" },
  { q: "landing.faqTimeQ", a: "landing.faqTimeA" },
  { q: "landing.faqMissQ", a: "landing.faqMissA" },
  { q: "landing.faqWaitlistQ", a: "landing.faqWaitlistA" },
  { q: "landing.faqCertificateQ", a: "landing.faqCertificateA" },
] as const;

export default async function Landing({ searchParams }: PageProps<"/">) {
  const { t, locale } = await getI18n();
  await loadData();
  const sp = await searchParams;
  const city = cityFor(locale);
  const programmes = publishedProgrammes().map((p) => ({
    ...loc(p, locale),
    cohort: nextCohortFor(p.id),
    modules: modulesFor(p.id).map((m) => loc(m.module, locale)),
  }));
  const options = programmes.map((p) => ({ slug: p.slug, title: p.title }));
  const requested = typeof sp.programme === "string" ? sp.programme : undefined;
  const defaultProgramme = options.some((o) => o.slug === requested) ? requested : undefined;

  // The strip shows whichever programme starts next, so its "starts" marker is always true.
  const upcoming = programmes
    .filter((p) => p.cohort?.status === "upcoming")
    .sort((a, b) => a.cohort!.startsOn.getTime() - b.cohort!.startsOn.getTime())[0];
  const featured = upcoming ?? programmes[0];
  const lead = programmes.find((p) => p.slug === "devops-engineer") ?? programmes[0];
  const instructor = lead?.cohort ? cohortRoster(lead.cohort.id).instructors[0] : undefined;
  const formDefault = defaultProgramme ?? upcoming?.slug;

  return (
    <>
      {/* Hero: the evening */}
      <section className="bg-dusk text-paper">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 md:px-8 md:pt-24">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <h1 className="font-wide text-5xl leading-[0.95] font-extrabold tracking-tight md:text-7xl">
                {t("landing.heroTitle")}
              </h1>
              <p className="mt-6 max-w-xl text-lg text-paper/75 md:text-xl">{t("landing.heroLead", { city })}</p>
            </div>
            <div>
              <WaitlistForm
                key={formDefault ?? "default"}
                programmes={options}
                defaultProgramme={formDefault}
                tone="dark"
                stacked
              />
              {demoLoginEnabled() && (
                <Link
                  href="/login"
                  className="mt-4 inline-block text-sm font-medium text-paper/80 underline-offset-4 hover:underline"
                >
                  {t("landing.exploreDemo")}
                </Link>
              )}
            </div>
          </div>

          {featured && <WeekStrip programme={featured} t={t} />}
        </div>
      </section>

      {/* Contrast */}
      <section id="how" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto grid max-w-6xl md:grid-cols-2">
          <div className="border-b border-line px-4 py-14 md:border-e md:border-b-0 md:px-8">
            <p className="mb-5 text-sm font-semibold text-muted">{t("landing.contrastOthers")}</p>
            <p className="font-wide text-3xl leading-tight font-bold tracking-tight text-muted md:text-4xl">
              {rich(t("landing.contrastOthersBody"), {
                s: (c) => <span className="line-through decoration-2">{c}</span>,
              })}
            </p>
          </div>
          <div className="px-4 py-14 md:px-8">
            <p className="mb-5 text-sm font-semibold">AcadeMe</p>
            <p className="font-wide text-3xl leading-tight font-bold tracking-tight md:text-4xl">
              {t("landing.contrastUs")}
            </p>
          </div>
        </div>
      </section>

      {/* A week */}
      <section id="week" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 md:px-8">
        <Heading
          kicker={t("landing.weekKicker")}
          title={t("landing.weekTitle")}
          lead={t("landing.weekLead", { city })}
        />
        <ol className="mt-12 grid border-t border-line md:grid-cols-5">
          {WEEK.map((d) => (
            <li
              key={d.day}
              className="flex items-baseline gap-4 border-b border-line py-5 md:block md:border-e md:border-b-0 md:px-5 md:py-6 md:first:ps-0 md:last:border-e-0"
            >
              <p className="font-condensed w-28 shrink-0 text-lg font-semibold md:w-auto md:text-2xl">{t(d.day)}</p>
              <div className="md:mt-8">
                <span className={clsx("mb-3 hidden h-1 w-10 rounded-full md:block", KIND_BAR[d.kind])} aria-hidden />
                <p className="font-medium">{t(d.what)}</p>
                <p className="text-sm text-muted tabular-nums">{t("landing.timeRange", { from: d.from, to: d.to })}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* What's included */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-24 md:px-8">
          <Heading kicker={t("landing.includedKicker")} title={t("landing.includedTitle")} />
          <dl className="mt-12 grid gap-x-16 md:grid-cols-2">
            {INCLUDED.map((f) => (
              <div key={f.title} className="border-t border-line py-6">
                <dt className="text-lg font-semibold">{t(f.title)}</dt>
                <dd className="mt-1 text-muted">{t(f.body)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Programmes */}
      <section id="programmes" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 md:px-8">
        <Heading kicker={t("landing.programmesKicker")} title={t("landing.programmesTitle")} />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {programmes.map((p) => (
            <article key={p.id} className="flex flex-col rounded-md border border-line bg-surface p-7 md:p-8">
              <h3 className="font-wide text-3xl font-bold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-muted">{p.tagline}</p>
              <ol className="mt-6 border-t border-line">
                {p.modules.map((m) => (
                  <li key={m.id} className="flex gap-4 border-b border-line py-2 text-sm">
                    <span className="font-condensed min-w-8 shrink-0 font-semibold whitespace-nowrap text-muted">
                      {t("landing.weekShort", { week: m.week })}
                    </span>
                    <span>{m.title}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-auto pt-8">
                <p className="flex items-center gap-2 text-sm text-muted">
                  {p.cohort?.status === "upcoming" ? (
                    <>
                      <span className="size-2.5 rounded-full bg-accent" aria-hidden />
                      {t("landing.nextCohortStarts", { date: formatDate(p.cohort.startsOn) })}
                    </>
                  ) : (
                    t("landing.cohortRunning")
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <p>
                    <span className="font-wide block text-5xl font-extrabold tracking-tight">
                      {formatMoney(p.priceCents, p.currency)}
                    </span>
                    <span className="text-sm text-muted">{t("landing.weeksLive", { count: p.durationWeeks })}</span>
                  </p>
                  <Link
                    href={`/?programme=${p.slug}#waitlist`}
                    className="rounded-md border border-ink px-4 py-2.5 text-sm font-medium transition-colors hover:bg-ink hover:text-paper"
                  >
                    {t("landing.joinWaitlist")}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Instructor + outcomes */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-16 px-4 py-24 md:px-8 lg:grid-cols-2">
          {instructor && (
            <div>
              <p className="mb-6 text-sm font-semibold text-muted">{t("landing.taughtBy")}</p>
              <div className="flex items-center gap-5">
                <Avatar profile={instructor} size={72} />
                <div>
                  <p className="font-wide text-2xl font-bold tracking-tight">{instructor.fullName}</p>
                  <p className="text-muted">{instructor.headline}</p>
                </div>
              </div>
              <p className="mt-6 max-w-md text-muted">{t("landing.taughtByBody")}</p>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-muted">{t("landing.outcomesKicker")}</p>
            <dl>
              {OUTCOMES.map((o) => (
                <div key={o.title} className="border-b border-line py-4 last:border-b-0">
                  <dt className="font-semibold">{t(o.title)}</dt>
                  <dd className="text-muted">{t(o.body)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:px-8 lg:grid-cols-[1fr_2fr]">
          <Heading kicker={t("landing.faqKicker")} title={t("landing.faqTitle")} />
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
                  {t(q)}
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-muted">{t(a)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action: the evening again */}
      <section id="waitlist" className="scroll-mt-16 bg-dusk text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 md:px-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <h2 className="font-wide text-4xl leading-none font-extrabold tracking-tight md:text-6xl">
              {t("landing.ctaTitle")}
            </h2>
            <p className="mt-4 max-w-md text-paper/75">{t("landing.ctaBody")}</p>
          </div>
          <WaitlistForm
            key={formDefault ?? "default"}
            programmes={options}
            defaultProgramme={formDefault}
            tone="dark"
          />
        </div>
      </section>
    </>
  );
}

function Heading({ kicker, title, lead }: { kicker: string; title: string; lead?: string }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-muted">{kicker}</p>
      <h2 className="font-wide max-w-3xl text-3xl leading-tight font-extrabold tracking-tight md:text-5xl">{title}</h2>
      {lead && <p className="mt-4 max-w-xl text-muted">{lead}</p>}
    </div>
  );
}

/**
 * The one bold element: the six weeks of the next cohort as a strip, from the
 * start date to the capstone demo. Each week fills in once on load.
 */
function WeekStrip({
  programme,
  t,
}: {
  t: T;
  programme: {
    title: string;
    modules: { id: string; week: number; title: string }[];
    cohort?: { status: string; startsOn: Date };
  };
}) {
  const starts = programme.cohort?.status === "upcoming" ? programme.cohort.startsOn : undefined;
  const last = programme.modules.length;
  return (
    <div
      className="mt-14 border-t border-paper/15 pt-8"
      aria-label={t("landing.stripLabel", { title: programme.title })}
    >
      <p className="mb-5 text-sm text-paper/70">
        {rich(t("landing.stripNextUp", { title: programme.title }), {
          b: (c) => <span className="font-semibold text-paper">{c}</span>,
        })}
      </p>
      <ol className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
        {programme.modules.map((m, i) => (
          <li key={m.id}>
            <div className="h-2 overflow-hidden rounded-full bg-paper/15">
              <div
                className={clsx("strip-fill h-full rounded-full", m.week === last ? "bg-accent" : "bg-paper/80")}
                style={{ "--i": i } as React.CSSProperties}
              />
            </div>
            <p className="font-condensed mt-3 text-sm font-semibold text-paper/60">
              {t("landing.stripWeek", { week: m.week })}
            </p>
            <p className="font-condensed text-xl leading-tight font-semibold md:text-2xl">{m.title}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-accent" aria-hidden />
          {starts ? t("landing.stripStarts", { date: formatShortDate(starts) }) : t("landing.stripNextDates")}
        </p>
        <p className="flex items-center gap-2 text-paper/80">
          {t("landing.stripCapstone", { week: last })}
          <span className="size-2.5 rounded-full border-2 border-accent" aria-hidden />
        </p>
      </div>
    </div>
  );
}
