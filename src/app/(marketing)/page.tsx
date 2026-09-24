import { formatMoney } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowRight,
  Award,
  CalendarClock,
  Check,
  FlaskConical,
  FolderGit2,
  MessagesSquare,
  Video,
  Users,
} from "lucide-react";
import { Avatar, KindMark, Label } from "@/components/ui";
import { WaitlistForm } from "@/components/waitlist-form";
import { demoLoginEnabled } from "@/lib/auth/config";
import { cohortRoster, publishedProgrammes, modulesFor, nextCohortFor } from "@/lib/data/repo";
import { ACADEMY_TZ, formatDate } from "@/lib/time";
import type { CalendarKind } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: "AcadeMe · Live DevOps and AI cohorts for career switchers" },
  description:
    "Six-week live programmes in DevOps and AI engineering. Real classes, hands-on labs, a capstone project and a cohort making the same move as you.",
  openGraph: {
    title: "AcadeMe · Switch into cloud with a cohort, not a playlist",
    description: "Six-week live programmes in DevOps and AI engineering. Join the waitlist for the next cohort.",
    type: "website",
  },
};

const TZ_CITY = (ACADEMY_TZ.split("/").pop() ?? ACADEMY_TZ).replaceAll("_", " ");

const price = (cents: number, currency: string) => formatMoney(cents, currency);

const FEATURES = [
  {
    icon: Video,
    title: "Live classes",
    body: "Two 90-minute classes a week with an instructor, not a pre-recorded video. Missed one? Watch the recording.",
  },
  {
    icon: FlaskConical,
    title: "Hands-on labs",
    body: "Every week you build something real in the cloud: servers, networks, Terraform, Kubernetes clusters.",
  },
  {
    icon: FolderGit2,
    title: "Assignments with feedback",
    body: "Submit a repository, get a grade and written feedback from the person who taught the class.",
  },
  {
    icon: Award,
    title: "A capstone you can show",
    body: "Finish by building a production-ready platform in a small team, then present it to the cohort.",
  },
  {
    icon: MessagesSquare,
    title: "Your cohort",
    body: "A private space with the people starting when you do. Ask questions, share wins, form study groups.",
  },
  {
    icon: CalendarClock,
    title: "Weekly office hours",
    body: "Stuck on a lab? Bring it to office hours and work through it live with your instructor.",
  },
];

const OUTCOMES = [
  {
    icon: FolderGit2,
    title: "A GitHub full of real infrastructure",
    body: "Labs and assignments you built, not screenshots of someone else's.",
  },
  {
    icon: Award,
    title: "A capstone for your portfolio",
    body: "A team-built production platform you can walk an interviewer through.",
  },
  { icon: Check, title: "A verifiable certificate", body: "With a public link employers can check." },
  { icon: Users, title: "A network", body: "The people who made the switch with you." },
];

const WEEK: { day: string; kind: CalendarKind; label: string }[] = [
  { day: "Mon", kind: "class", label: "Live class" },
  { day: "Tue", kind: "lab", label: "Lab session" },
  { day: "Wed", kind: "office_hours", label: "Office hours" },
  { day: "Thu", kind: "class", label: "Live class" },
  { day: "Fri", kind: "workshop", label: "Project work" },
];

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
  const programmes = publishedProgrammes().map((p) => {
    const cohort = nextCohortFor(p.id);
    return { ...p, cohort, modules: modulesFor(p.id).map((m) => m.module) };
  });
  const options = programmes.map((p) => ({ slug: p.slug, title: p.title }));
  const requested = typeof sp.programme === "string" ? sp.programme : undefined;
  const defaultProgramme = options.some((o) => o.slug === requested) ? requested : undefined;

  const upcoming = programmes
    .filter((p) => p.cohort?.status === "upcoming")
    .sort((a, b) => a.cohort!.startsOn.getTime() - b.cohort!.startsOn.getTime())[0];
  const devops = programmes.find((p) => p.slug === "devops-engineer") ?? programmes[0];
  const instructor = devops.cohort ? cohortRoster(devops.cohort.id).instructors[0] : undefined;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 md:px-8 md:pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div>
          <Label className="mb-5">Live cohorts for career switchers</Label>
          <h1 className="text-5xl leading-[0.95] font-semibold tracking-tight md:text-7xl">
            Switch into cloud with a cohort, <span className="text-accent">not a playlist.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted md:text-xl">
            Six-week live programmes in DevOps and AI engineering. Learn in real classes, build in real labs, ship a
            real project, and do it alongside people making the same move.
          </p>
          <div className="mt-8 max-w-xl">
            <WaitlistForm
              key={defaultProgramme ?? "default"}
              programmes={options}
              defaultProgramme={defaultProgramme ?? upcoming?.slug}
            />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {upcoming?.cohort && (
              <span className="font-mono text-xs tracking-wider text-muted uppercase">
                Next: {upcoming.title} · starts {formatDate(upcoming.cohort.startsOn)}
              </span>
            )}
            {demoLoginEnabled() && (
              <Link href="/login" className="inline-flex items-center gap-1.5 font-medium hover:text-accent">
                Explore the demo <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
        <CohortBoard />
      </section>

      {/* Contrast */}
      <section id="how" className="scroll-mt-16 border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-px bg-line md:grid-cols-2">
          <div className="bg-surface px-4 py-14 md:px-8">
            <Label className="mb-4">Most online courses</Label>
            <Flow steps={["Watch a video", "Take a quiz", "Forget it by Friday"]} muted />
          </div>
          <div className="bg-surface px-4 py-14 md:px-8">
            <Label className="mb-4 text-accent">AcadeMe</Label>
            <Flow steps={["Learn it live", "Build it in a lab", "Ship it in a project"]} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-24 md:px-8">
        <SectionTitle
          eyebrow="What a cohort gets"
          title="Everything you'd get at a good bootcamp. Without moving cities."
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface p-7">
              <span className="mb-5 flex size-10 items-center justify-center rounded-md bg-ink text-paper">
                <Icon size={18} />
              </span>
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* A week */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-24 md:px-8">
          <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.12em] uppercase opacity-60">
            A week at AcadeMe
          </p>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">
            A rhythm you can keep with a full-time job.
          </h2>
          <p className="mt-4 max-w-xl opacity-70">Classes run in the evening, at 19:00 {TZ_CITY} time.</p>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-md bg-paper/15 sm:grid-cols-5">
            {WEEK.map((d) => (
              <li key={d.day} className="bg-ink p-5">
                <p className="font-mono text-xs tracking-wider uppercase opacity-60">{d.day}</p>
                <p className="mt-6 flex items-center gap-2 text-lg font-medium">
                  <KindMark kind={d.kind} /> {d.label}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Curriculum */}
      <section className="mx-auto max-w-6xl px-4 py-24 md:px-8">
        <SectionTitle
          eyebrow={`${devops.title} · ${devops.durationWeeks} weeks`}
          title="From Linux basics to production Kubernetes."
        />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devops.modules.map((m) => (
            <li key={m.id} className="rounded-md border border-line bg-surface p-6">
              <span className="font-mono text-xs font-semibold text-accent">WEEK {m.week}</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">{m.title}</h3>
              <p className="mt-2 text-sm text-muted">{m.summary}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Programmes */}
      <section id="programmes" className="scroll-mt-16 border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-24 md:px-8">
          <SectionTitle eyebrow="Programmes" title="Pick your path." />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {programmes.map((p) => (
              <article key={p.id} className="flex flex-col rounded-md border border-line bg-paper p-7">
                <Label>{p.durationWeeks} weeks · Live cohort</Label>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-muted">{p.tagline}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.includes.map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check size={14} strokeWidth={3} className="text-accent" /> {i}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <p className="font-mono text-xs tracking-wider text-muted uppercase">
                    {p.cohort?.status === "upcoming"
                      ? `Next cohort starts ${formatDate(p.cohort.startsOn)}`
                      : "Current cohort in progress · next dates soon"}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-5">
                    <span className="text-4xl font-semibold tracking-tight">{price(p.priceCents, p.currency)}</span>
                    <Link
                      href={`/?programme=${p.slug}#waitlist`}
                      className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-accent hover:text-accent-ink"
                    >
                      Join waitlist <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Instructor + outcomes */}
      <section className="mx-auto grid max-w-6xl gap-16 px-4 py-24 md:px-8 lg:grid-cols-2">
        {instructor && (
          <div>
            <Label className="mb-6">Taught by</Label>
            <div className="flex items-center gap-5">
              <Avatar profile={instructor} size={72} />
              <div>
                <p className="text-2xl font-semibold tracking-tight">{instructor.fullName}</p>
                <p className="text-muted">{instructor.headline}</p>
              </div>
            </div>
            <p className="mt-6 max-w-md text-muted">
              Every class is taught live by the person who grades your work and runs your office hours.
            </p>
          </div>
        )}
        <div>
          <Label className="mb-6">What you leave with</Label>
          <ul className="space-y-4">
            {OUTCOMES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink">
                  <Icon size={16} strokeWidth={2.5} />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:px-8 lg:grid-cols-[1fr_2fr]">
          <SectionTitle eyebrow="FAQ" title="Questions people ask first." />
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
                  {q}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line font-mono transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="waitlist" className="scroll-mt-16 bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 md:px-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <h2 className="text-4xl leading-none font-semibold tracking-tight md:text-6xl">
              Start with the next cohort.
            </h2>
            <p className="mt-4 max-w-md opacity-70">
              Waitlist members hear about dates and pricing first and get first access to seats.
            </p>
          </div>
          <WaitlistForm
            key={defaultProgramme ?? "default"}
            programmes={options}
            defaultProgramme={defaultProgramme ?? upcoming?.slug}
            tone="dark"
          />
        </div>
      </section>
    </>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <Label className="mb-3">{eyebrow}</Label>
      <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
    </div>
  );
}

function Flow({ steps, muted }: { steps: string[]; muted?: boolean }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li
          key={s}
          className={clsx(
            "flex items-center gap-4 text-2xl font-semibold tracking-tight md:text-3xl",
            muted && "text-muted",
          )}
        >
          <span
            className={clsx(
              "flex size-8 shrink-0 items-center justify-center rounded-md font-mono text-sm",
              muted ? "border border-line" : "bg-accent text-accent-ink",
            )}
          >
            {i + 1}
          </span>
          {/* The last step ("Forget it by Friday") is the outcome, so it isn't crossed out. */}
          <span className={clsx(muted && (i < steps.length - 1 ? "line-through decoration-2" : "opacity-60"))}>
            {s}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Geometric picture of a cohort: six weeks, each with a class, a lab and project work. */
function CohortBoard() {
  const rows: { kind: CalendarKind; label: string }[] = [
    { kind: "class", label: "Class" },
    { kind: "lab", label: "Lab" },
    { kind: "workshop", label: "Build" },
  ];
  const current = 4;
  return (
    <div className="rounded-md border border-line bg-surface p-5 md:p-7" aria-hidden>
      <div className="mb-5 flex items-center justify-between font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
        <span>Cohort · 6 weeks</span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 animate-pulse rounded-full bg-accent" /> Live
        </span>
      </div>
      <div className="grid grid-cols-[auto_repeat(6,1fr)] gap-2">
        <span />
        {Array.from({ length: 6 }, (_, w) => (
          <span
            key={w}
            className={clsx(
              "text-center font-mono text-[11px] font-semibold",
              w + 1 === current ? "text-accent" : "text-muted",
            )}
          >
            W{w + 1}
          </span>
        ))}
        {rows.map((r) => (
          <Row key={r.kind} label={r.label} current={current} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-2">
        <span className="w-12 font-mono text-[11px] text-muted uppercase">Ship</span>
        <div className="flex h-10 items-center justify-end rounded-[4px] border-2 border-dashed border-line px-3 font-mono text-[11px] text-muted uppercase">
          Capstone →
        </div>
      </div>
    </div>
  );
}

function Row({ label, current }: { label: string; current: number }) {
  return (
    <>
      <span className="flex w-12 items-center font-mono text-[11px] text-muted uppercase">{label}</span>
      {Array.from({ length: 6 }, (_, w) => {
        const week = w + 1;
        return (
          <span
            key={w}
            className={clsx(
              "aspect-square rounded-[4px]",
              week < current && "bg-ink",
              week === current && "bg-accent",
              week > current && "border-2 border-line",
            )}
          />
        );
      })}
    </>
  );
}
