import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, ArrowUpRight, Check, Video } from "lucide-react";
import {
  Avatar,
  ButtonLink,
  Card,
  Empty,
  KindMark,
  Label,
  Legend,
  ProgressBar,
  ProgressBreakdown,
} from "@/components/ui";
import {
  cohortAssignments,
  cohortPulse,
  cohortRoster,
  cohortWeek,
  isLive,
  nextClass,
  nextLessonFor,
  primaryCohort,
  profileById,
  progressFor,
  submissionFor,
  tasksFor,
  thisWeek,
} from "@/lib/data/repo";
import { currentUser, mustChangePassword } from "@/lib/session";
import type { Cohort, Profile } from "@/lib/types";
import { hasAdminArea } from "@/lib/authz";
import { Welcome } from "@/components/welcome";
import { addDays, formatShortDate, formatTime, formatWeekday, greeting, relativeDay, zonedParts } from "@/lib/time";

export const metadata = { title: "Home" };

export default async function Dashboard() {
  const user = await currentUser();
  const now = new Date();
  const primary = primaryCohort(user.id);
  const firstName = user.fullName.split(" ")[0];

  if (!primary) {
    return (
      <>
        <Hello name={firstName} now={now} subtitle="You're not in a cohort yet." />
        <Empty>
          Browse{" "}
          <Link href="/programmes" className="underline">
            programmes
          </Link>{" "}
          to join the next cohort.
        </Empty>
      </>
    );
  }

  const { cohort, programme, role } = primary;
  const { week, totalWeeks } = cohortWeek(cohort, now);
  const next = nextClass(cohort.id, now);
  const pulse = cohortPulse(cohort.id, now);
  const weekItems = thisWeek(user.id, now);
  const today = zonedParts(now).weekday;

  return (
    <>
      <Hello name={firstName} now={now} subtitle={`${cohort.name} · Cohort ${cohort.code}`} />
      {mustChangePassword(user.id) && (
        <p className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-k-workshop/40 bg-k-workshop/10 p-4 text-sm">
          <span className="flex-1">
            You&apos;re signed in with a temporary password. Pick your own so only you know it.
          </span>
          <Link href="/profile#password" className="font-medium underline underline-offset-4">
            Change password
          </Link>
        </p>
      )}
      {!user.onboardedAt && (
        <Welcome firstName={firstName} staff={role !== "student"} startHref={welcomeHref(user, cohort, role, now)} />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-5 lg:col-span-2">
          {role === "student" && <ContinueLearning userId={user.id} cohort={cohort} now={now} />}

          {/* Next class */}
          <section className="rounded-md bg-ink p-6 text-paper md:p-8">
            <p className="text-[13px] font-medium opacity-60">Next class</p>
            {next ? (
              <>
                <p className="mt-6 font-mono text-sm opacity-70">
                  {relativeDay(next.startsAt, now)} · {formatTime(next.startsAt)}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{next.title}</h2>
                <p className="mt-2 max-w-lg text-sm opacity-70">{next.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/cohorts/${cohort.id}/classes/${next.id}`}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                      isLive(next, now)
                        ? "bg-accent text-accent-ink"
                        : "bg-paper text-ink hover:bg-accent hover:text-accent-ink",
                    )}
                  >
                    <Video size={16} /> {isLive(next, now) ? "Join classroom" : "Open classroom"}
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-6 text-lg">No more classes in this cohort.</p>
            )}
          </section>

          {role === "student" ? (
            <Tasks userId={user.id} cohortId={cohort.id} now={now} />
          ) : (
            <InstructorGlance cohortId={cohort.id} now={now} />
          )}

          <Card
            title="This week"
            action={
              <Link href="/calendar" className="text-xs text-muted hover:text-ink">
                Calendar →
              </Link>
            }
          >
            <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-5">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => {
                const items = weekItems.filter((e) => zonedParts(e.startsAt).weekday === i);
                return (
                  <li key={day} className={clsx("min-h-24 bg-surface p-3", i === today && "bg-paper")}>
                    <p
                      className={clsx(
                        "mb-2 font-mono text-[11px] tracking-wider uppercase",
                        i === today ? "font-semibold text-accent" : "text-muted",
                      )}
                    >
                      {day}
                    </p>
                    <ul className="space-y-1.5">
                      {items.map((e) => (
                        <li key={e.id} className="flex items-start gap-1.5 text-xs leading-snug">
                          <span className="mt-1">
                            <KindMark kind={e.kind} />
                          </span>
                          <span>{e.title}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          {role === "student" && <ProgressCard userId={user.id} cohort={cohort} week={week} totalWeeks={totalWeeks} />}
          {role !== "student" && (
            <Card title="Cohort week">
              <p className="text-4xl font-semibold tracking-tight">
                {week}
                <span className="text-muted">/{totalWeeks}</span>
              </p>
            </Card>
          )}

          <Card title="Cohort community">
            <ul className="space-y-3 text-sm">
              <li className="flex items-baseline justify-between gap-2">
                <span>New discussions this week</span>
                <span className="font-mono text-lg font-semibold">{pulse.newDiscussions}</span>
              </li>
              {pulse.currentLab && (
                <li className="flex items-baseline justify-between gap-2">
                  <span>Finished Lab #{String(pulse.currentLab.number).padStart(2, "0")}</span>
                  <span className="font-mono text-lg font-semibold">{pulse.labFinishers}</span>
                </li>
              )}
            </ul>
            <ButtonLink href="/community" variant="ghost" className="mt-4 w-full">
              Open community
            </ButtonLink>
          </Card>

          <Card title="Programme">
            <p className="font-semibold">{programme.title}</p>
            <p className="mt-1 text-sm text-muted">
              {formatShortDate(cohort.startsOn)} to {formatShortDate(cohort.endsOn)}
            </p>
            <Link
              href={`/cohorts/${cohort.id}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium hover:text-accent"
            >
              Cohort overview <ArrowUpRight size={14} />
            </Link>
          </Card>
        </div>
      </div>
      <Legend className="mt-10" />
    </>
  );
}

function welcomeHref(user: Profile, cohort: Cohort, role: string, now: Date) {
  if (role !== "student") return hasAdminArea(user) ? "/admin" : undefined;
  const next = nextLessonFor(user.id, cohort, now);
  return next ? `/cohorts/${cohort.id}/modules/${next.module.id}/${next.lesson.id}` : undefined;
}

function Hello({ name, now, subtitle }: { name: string; now: Date; subtitle: string }) {
  return (
    <header className="mb-8">
      <Label className="mb-2">
        {formatWeekday(now)} · {formatShortDate(now)}
      </Label>
      <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
        {greeting(now)}, {name}
      </h1>
      <p className="mt-2 text-muted">{subtitle}</p>
    </header>
  );
}

function ProgressCard({
  userId,
  cohort,
  week,
  totalWeeks,
}: {
  userId: string;
  cohort: Cohort;
  week: number;
  totalWeeks: number;
}) {
  const p = progressFor(userId, cohort);
  return (
    <Card title="Your progress">
      <p className="text-5xl font-semibold tracking-tight">{p.percent}%</p>
      <p className="mt-1 mb-4 text-sm text-muted">
        Week {week} of {totalWeeks}
      </p>
      <ProgressBar value={p.percent} />
      <ProgressBreakdown progress={p} className="mt-4" />
    </Card>
  );
}

function ContinueLearning({ userId, cohort, now }: { userId: string; cohort: Cohort; now: Date }) {
  const next = nextLessonFor(userId, cohort, now);
  if (!next) {
    return (
      <Card title="Continue learning">
        <p className="font-medium">You&apos;ve finished every lesson. Nice.</p>
      </Card>
    );
  }
  const { module, lesson, total } = next;
  return (
    <Link
      href={`/cohorts/${cohort.id}/modules/${module.id}/${lesson.id}`}
      className="group flex items-center gap-5 rounded-md border-2 border-ink bg-surface p-5 transition-colors hover:border-accent md:p-6"
    >
      <div className="min-w-0 flex-1">
        <Label>Continue where you left off</Label>
        <p className="mt-2 truncate text-xl font-semibold tracking-tight group-hover:text-accent">{lesson.title}</p>
        <p className="mt-1 text-sm text-muted">
          Week {module.week} · Lesson {lesson.position} of {total} · {lesson.durationMin} min
        </p>
      </div>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-ink text-paper transition-colors group-hover:bg-accent group-hover:text-accent-ink">
        <ArrowRight size={18} />
      </span>
    </Link>
  );
}

function Tasks({ userId, cohortId, now }: { userId: string; cohortId: string; now: Date }) {
  const all = tasksFor(userId, cohortId, now);
  // Finished work doesn't need attention; it's summarised in one line instead.
  const tasks = all.filter((t) => !t.done);
  const doneCount = all.length - tasks.length;
  return (
    <Card
      title="Your tasks"
      action={doneCount > 0 ? <span className="text-xs text-muted">{doneCount} done recently</span> : undefined}
    >
      {tasks.length === 0 ? (
        <Empty>Nothing due. Enjoy it.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((t) => {
            const overdue = !t.done && t.dueAt < now;
            return (
              <li key={t.id}>
                <Link href={t.href} className="group flex items-center gap-3 py-3">
                  <span
                    className={clsx(
                      "flex size-5 shrink-0 items-center justify-center rounded-[4px] border",
                      t.done ? "border-ink bg-ink text-paper" : "border-muted",
                    )}
                  >
                    {t.done && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className={clsx("flex-1 text-sm group-hover:text-accent", t.done && "text-muted line-through")}>
                    {t.title}
                  </span>
                  <span className={clsx("font-mono text-xs", overdue ? "text-k-deadline" : "text-muted")}>
                    {t.done ? "Done" : overdue ? "Overdue" : `Due ${dueLabel(t.dueAt, now)}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function InstructorGlance({ cohortId, now }: { cohortId: string; now: Date }) {
  const { students } = cohortRoster(cohortId);
  const recent = cohortAssignments(cohortId)
    .filter((a) => a.dueAt <= addDays(now, 7))
    .slice(-2);
  return (
    <Card title="Submissions">
      <ul className="space-y-4">
        {recent.map((a) => {
          const submitted = students.filter((s) => submissionFor(s.id, a.id));
          return (
            <li key={a.id}>
              <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
                <Link href={`/cohorts/${cohortId}/assignments/${a.id}`} className="font-medium hover:text-accent">
                  {a.title}
                </Link>
                <span className="font-mono text-xs text-muted">
                  {submitted.length}/{students.length}
                </span>
              </div>
              <div className="flex -space-x-1">
                {submitted.slice(0, 12).map((s) => (
                  <span key={s.id} className="rounded-md ring-2 ring-surface">
                    <Avatar profile={profileById(s.id)!} size={22} />
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// "Due today", "Due tomorrow", "Due Friday", "Due 2 October".
function dueLabel(due: Date, now: Date) {
  const rel = relativeDay(due, now);
  return rel === "Today" || rel === "Tomorrow" ? rel.toLowerCase() : rel;
}
