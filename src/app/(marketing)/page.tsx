import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Avatar } from "@/components/ui";
import { WaitlistForm } from "@/components/waitlist-form";
import { demoLoginEnabled } from "@/lib/auth/config";
import { cohortRoster, publishedProgrammes, modulesFor, nextCohortFor } from "@/lib/data/repo";
import { formatMoney } from "@/lib/format";
import { ACADEMY_TZ, formatDate, formatShortDate } from "@/lib/time";
import type { CalendarKind } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: "AcadeMe: live DevOps and AI cohorts for career switchers" },
  description:
    "Six-week live programmes in DevOps and AI engineering. Evening classes, hands-on labs, a capstone project and a cohort making the same move as you.",
  openGraph: {
    title: "AcadeMe: switch into cloud with a cohort, not a playlist",
    description: "Six-week live programmes in DevOps and AI engineering. Join the waitlist for the next cohort.",
    type: "website",
  },
};

const TZ_CITY = (ACADEMY_TZ.split("/").pop() ?? ACADEMY_TZ).replaceAll("_", " ");

const INCLUDED = [
  {
    title: "Live classes",
    body: "Two 90-minute classes a week with an instructor, not a pre-recorded video. Missed one? Watch the recording.",
  },
  {
    title: "Hands-on labs",
    body: "Every week you build something real in the cloud: servers, networks, Terraform, Kubernetes clusters.",
  },
  {
    title: "Assignments with feedback",
    body: "Submit a repository, get a grade and written feedback from the person who taught the class.",
  },
  {
    title: "A capstone you can show",
    body: "Finish by building a production-ready platform in a small team, then present it to the cohort.",
  },
  {
    title: "Your cohort",
    body: "A private space with the people starting when you do. Ask questions, share wins, form study groups.",
  },
  {
    title: "Weekly office hours",
    body: "Stuck on a lab? Bring it to office hours and work through it live with your instructor.",
  },
];

const OUTCOMES = [
  {
    title: "A GitHub full of real infrastructure",
    body: "Labs and assignments you built, not screenshots of someone else's.",
  },
  {
    title: "A capstone for your portfolio",
    body: "A team-built production platform you can walk an interviewer through.",
  },
  { title: "A verifiable certificate", body: "With a public link employers can check." },
  { title: "A network", body: "The people who made the switch with you." },
];

// Mirrors the cohort calendar in the app, so the page promises what the timetable delivers.
const WEEK: { day: string; kind: CalendarKind; what: string; time: string }[] = [
  { day: "Monday", kind: "class", what: "Live class", time: "19:00 to 20:30" },
  { day: "Tuesday", kind: "lab", what: "Lab session", time: "19:00 to 20:30" },
  { day: "Wednesday", kind: "office_hours", what: "Office hours", time: "18:00 to 19:00" },
  { day: "Thursday", kind: "class", what: "Live class", time: "19:00 to 20:30" },
  { day: "Friday", kind: "workshop", what: "Project work", time: "17:00 to 19:00" },
];

const KIND_BAR: Record<string, string> = {
  class: "bg-k-class",
  lab: "bg-k-lab",
  office_hours: "bg-k-office",
  workshop: "bg-k-workshop",
};

const FAQ = [
  {
    q: "Do I need experience?",
    a: "No cloud or DevOps experience needed. You should be comfortable using a computer and ready to spend a lot of time in a terminal. We start from Linux basics in week one.",
  },
  {
    q: "How much time does it take?",
    a: "Plan for 8 to 10 hours a week: two 90-minute live classes, short lessons, one lab and one assignment. Office hours are optional.",
  },
  {
    q: "What if I miss a live class?",
    a: "Every class is recorded and posted with the slides. Catch up, then bring questions to office hours or the cohort's Questions space.",
  },
  {
    q: "What happens after I join the waitlist?",
    a: "You'll get an email with dates and pricing before enrolment opens, and waitlist members get first access to seats. You don't pay anything to join the list.",
  },
  {
    q: "Do I get a certificate?",
    a: "Yes. Finish the lessons, labs, assignments and capstone and you get a certificate with a public link employers can use to verify it.",
  },
];

export default async function Landing({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const programmes = publishedProgrammes().map((p) => ({
    ...p,
    cohort: nextCohortFor(p.id),
    modules: modulesFor(p.id).map((m) => m.module),
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
                Switch into cloud with a cohort, not a playlist.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-paper/75 md:text-xl">
                Six weeks, live, Mondays and Thursdays at 19:00 {TZ_CITY} time. Learn in real classes, build in real
                labs and ship a real project, alongside people making the same move.
              </p>
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
                  Explore the demo
                </Link>
              )}
            </div>
          </div>

          {featured && <WeekStrip programme={featured} />}
        </div>
      </section>

      {/* Contrast */}
      <section id="how" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto grid max-w-6xl md:grid-cols-2">
          <div className="border-b border-line px-4 py-14 md:border-r md:border-b-0 md:px-8">
            <p className="mb-5 text-sm font-semibold text-muted">Most online courses</p>
            <p className="font-wide text-3xl leading-tight font-bold tracking-tight text-muted md:text-4xl">
              <span className="line-through decoration-2">Watch a video.</span>{" "}
              <span className="line-through decoration-2">Take a quiz.</span> Forget it by Friday.
            </p>
          </div>
          <div className="px-4 py-14 md:px-8">
            <p className="mb-5 text-sm font-semibold">AcadeMe</p>
            <p className="font-wide text-3xl leading-tight font-bold tracking-tight md:text-4xl">
              Learn it live. Build it in a lab. Ship it in a project.
            </p>
          </div>
        </div>
      </section>

      {/* A week */}
      <section id="week" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 md:px-8">
        <Heading
          kicker="A week at AcadeMe"
          title="A rhythm you can keep with a full-time job."
          lead={`Everything happens in the evening, ${TZ_CITY} time. Lessons fit in around it, and assignments are due Friday at 23:59.`}
        />
        <ol className="mt-12 grid border-t border-line md:grid-cols-5">
          {WEEK.map((d) => (
            <li
              key={d.day}
              className="flex items-baseline gap-4 border-b border-line py-5 md:block md:border-r md:border-b-0 md:px-5 md:py-6 md:first:pl-0 md:last:border-r-0"
            >
              <p className="font-condensed w-28 shrink-0 text-lg font-semibold md:w-auto md:text-2xl">{d.day}</p>
              <div className="md:mt-8">
                <span className={clsx("mb-3 hidden h-1 w-10 rounded-full md:block", KIND_BAR[d.kind])} aria-hidden />
                <p className="font-medium">{d.what}</p>
                <p className="text-sm text-muted tabular-nums">{d.time}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* What's included */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-24 md:px-8">
          <Heading kicker="What's included" title="Everything you'd get at a good bootcamp, without moving cities." />
          <dl className="mt-12 grid gap-x-16 md:grid-cols-2">
            {INCLUDED.map((f) => (
              <div key={f.title} className="border-t border-line py-6">
                <dt className="text-lg font-semibold">{f.title}</dt>
                <dd className="mt-1 text-muted">{f.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Programmes */}
      <section id="programmes" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 md:px-8">
        <Heading kicker="Programmes" title="Pick your path." />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {programmes.map((p) => (
            <article key={p.id} className="flex flex-col rounded-md border border-line bg-surface p-7 md:p-8">
              <h3 className="font-wide text-3xl font-bold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-muted">{p.tagline}</p>
              <ol className="mt-6 border-t border-line">
                {p.modules.map((m) => (
                  <li key={m.id} className="flex gap-4 border-b border-line py-2 text-sm">
                    <span className="font-condensed w-8 shrink-0 font-semibold text-muted">W{m.week}</span>
                    <span>{m.title}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-auto pt-8">
                <p className="flex items-center gap-2 text-sm text-muted">
                  {p.cohort?.status === "upcoming" ? (
                    <>
                      <span className="size-2.5 rounded-full bg-accent" aria-hidden />
                      Next cohort starts {formatDate(p.cohort.startsOn)}
                    </>
                  ) : (
                    "A cohort is running now. Next dates soon."
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <p>
                    <span className="font-wide block text-5xl font-extrabold tracking-tight">
                      {formatMoney(p.priceCents, p.currency)}
                    </span>
                    <span className="text-sm text-muted">{p.durationWeeks} weeks, live</span>
                  </p>
                  <Link
                    href={`/?programme=${p.slug}#waitlist`}
                    className="rounded-md border border-ink px-4 py-2.5 text-sm font-medium transition-colors hover:bg-ink hover:text-paper"
                  >
                    Join the waitlist
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
              <p className="mb-6 text-sm font-semibold text-muted">Taught by</p>
              <div className="flex items-center gap-5">
                <Avatar profile={instructor} size={72} />
                <div>
                  <p className="font-wide text-2xl font-bold tracking-tight">{instructor.fullName}</p>
                  <p className="text-muted">{instructor.headline}</p>
                </div>
              </div>
              <p className="mt-6 max-w-md text-muted">
                Every class is taught live by the person who grades your work and runs your office hours.
              </p>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-muted">What you leave with</p>
            <dl>
              {OUTCOMES.map((o) => (
                <div key={o.title} className="border-b border-line py-4 last:border-b-0">
                  <dt className="font-semibold">{o.title}</dt>
                  <dd className="text-muted">{o.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:px-8 lg:grid-cols-[1fr_2fr]">
          <Heading kicker="FAQ" title="Questions people ask first." />
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
                  {q}
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-muted">{a}</p>
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
              Start with the next cohort.
            </h2>
            <p className="mt-4 max-w-md text-paper/75">
              Waitlist members hear about dates and pricing first and get first access to seats.
            </p>
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
}: {
  programme: {
    title: string;
    modules: { id: string; week: number; title: string }[];
    cohort?: { status: string; startsOn: Date };
  };
}) {
  const starts = programme.cohort?.status === "upcoming" ? programme.cohort.startsOn : undefined;
  const last = programme.modules.length;
  return (
    <div className="mt-14 border-t border-paper/15 pt-8" aria-label={`${programme.title}, week by week`}>
      <p className="mb-5 text-sm text-paper/70">
        Next up: <span className="font-semibold text-paper">{programme.title}</span>
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
            <p className="font-condensed mt-3 text-sm font-semibold text-paper/60">Week {m.week}</p>
            <p className="font-condensed text-xl leading-tight font-semibold md:text-2xl">{m.title}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-accent" aria-hidden />
          {starts ? `Starts ${formatShortDate(starts)}` : "Next dates soon"}
        </p>
        <p className="flex items-center gap-2 text-paper/80">
          Capstone demo in week {last}
          <span className="size-2.5 rounded-full border-2 border-accent" aria-hidden />
        </p>
      </div>
    </div>
  );
}
