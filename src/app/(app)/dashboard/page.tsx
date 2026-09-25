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
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import type { T } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { rich } from "@/components/rich";
import { hasAdminArea } from "@/lib/authz";
import { Welcome } from "@/components/welcome";
import { officeStatus, unreadRepliesFor } from "@/lib/data/office-hours";
import { officeStatusText } from "@/components/office-hours-view";
import { addDays, formatShortDate, formatTime, formatWeekday, greeting, relativeDay, zonedParts } from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("dashboard.metaTitle") };
}

const WEEKDAYS = ["dashboard.mon", "dashboard.tue", "dashboard.wed", "dashboard.thu", "dashboard.fri"] as const;

export default async function Dashboard() {
  const { t, locale } = await getI18n();
  const user = await currentUser();
  const now = new Date();
  const primary = primaryCohort(user.id);
  const firstName = user.fullName.split(" ")[0];

  if (!primary) {
    return (
      <>
        <Hello t={t} name={firstName} now={now} subtitle={t("dashboard.noCohort")} />
        <Empty>
          {rich(t("dashboard.browseProgrammes"), {
            link: (c) => (
              <Link href="/programmes" className="underline">
                {c}
              </Link>
            ),
          })}
        </Empty>
      </>
    );
  }

  const { cohort, role } = primary;
  const programme = loc(primary.programme, locale);
  const { week, totalWeeks } = cohortWeek(cohort, now);
  const next = nextClass(cohort.id, now);
  const pulse = cohortPulse(cohort.id, now);
  const weekItems = thisWeek(user.id, now);
  const today = zonedParts(now).weekday;

  return (
    <>
      <Hello
        t={t}
        name={firstName}
        now={now}
        subtitle={t("dashboard.cohortSubtitle", { name: cohort.name, code: cohort.code })}
      />
      {mustChangePassword(user.id) && (
        <p className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-k-workshop/40 bg-k-workshop/10 p-4 text-sm">
          <span className="flex-1">{t("dashboard.tempPassword")}</span>
          <Link href="/profile#password" className="font-medium underline underline-offset-4">
            {t("dashboard.changePassword")}
          </Link>
        </p>
      )}
      {!user.onboardedAt && (
        <Welcome firstName={firstName} staff={role !== "student"} startHref={welcomeHref(user, cohort, role, now)} />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-5 lg:col-span-2">
          {role === "student" && <ContinueLearning t={t} locale={locale} userId={user.id} cohort={cohort} now={now} />}

          {/* Next class */}
          <section className="relative overflow-hidden rounded-2xl border border-violet/40 bg-gradient-to-br from-violet/25 via-surface to-cyan/10 p-6 text-ink md:p-8">
            <p className="text-[13px] font-medium opacity-60">{t("dashboard.nextClass")}</p>
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
                        ? "bg-brand text-white hover:opacity-90"
                        : "bg-ink text-paper hover:bg-slate-200",
                    )}
                  >
                    <Video size={16} />{" "}
                    {isLive(next, now) ? t("dashboard.joinClassroom") : t("dashboard.openClassroom")}
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-6 text-lg">{t("dashboard.noMoreClasses")}</p>
            )}
          </section>

          {role === "student" ? (
            <Tasks t={t} userId={user.id} cohortId={cohort.id} now={now} />
          ) : (
            <InstructorGlance t={t} cohortId={cohort.id} now={now} />
          )}

          <Card
            title={t("dashboard.thisWeek")}
            action={
              <Link href="/calendar" className="text-xs text-muted hover:text-ink">
                {t("dashboard.calendarLink")}
              </Link>
            }
          >
            <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-5">
              {WEEKDAYS.map((day, i) => {
                const items = weekItems.filter((e) => zonedParts(e.startsAt).weekday === i);
                return (
                  <li key={day} className={clsx("min-h-24 bg-surface p-3", i === today && "bg-paper")}>
                    <p
                      className={clsx(
                        "mb-2 font-mono text-[11px] tracking-wider uppercase",
                        i === today ? "font-semibold text-accent" : "text-muted",
                      )}
                    >
                      {t(day)}
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
          {role === "student" && (
            <ProgressCard t={t} userId={user.id} cohort={cohort} week={week} totalWeeks={totalWeeks} />
          )}
          {role === "student" && <OfficeHoursCard t={t} userId={user.id} cohortId={cohort.id} now={now} />}
          {role !== "student" && (
            <Card title={t("dashboard.cohortWeek")}>
              <p className="text-4xl font-semibold tracking-tight">
                {week}
                <span className="text-muted">/{totalWeeks}</span>
              </p>
            </Card>
          )}

          <Card title={t("dashboard.cohortCommunity")}>
            <ul className="space-y-3 text-sm">
              <li className="flex items-baseline justify-between gap-2">
                <span>{t("dashboard.newDiscussions")}</span>
                <span className="font-mono text-lg font-semibold">{pulse.newDiscussions}</span>
              </li>
              {pulse.currentLab && (
                <li className="flex items-baseline justify-between gap-2">
                  <span>
                    {t("dashboard.finishedLab", { number: String(pulse.currentLab.number).padStart(2, "0") })}
                  </span>
                  <span className="font-mono text-lg font-semibold">{pulse.labFinishers}</span>
                </li>
              )}
            </ul>
            <ButtonLink href="/community" variant="ghost" className="mt-4 w-full">
              {t("dashboard.openCommunity")}
            </ButtonLink>
          </Card>

          <Card title={t("dashboard.programme")}>
            <p className="font-semibold">{programme.title}</p>
            <p className="mt-1 text-sm text-muted">
              {t("dashboard.dateRange", {
                start: formatShortDate(cohort.startsOn),
                end: formatShortDate(cohort.endsOn),
              })}
            </p>
            <Link
              href={`/cohorts/${cohort.id}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium hover:text-accent"
            >
              {t("dashboard.cohortOverview")} <ArrowUpRight size={14} className="rtl:-scale-x-100" />
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

function Hello({ t, name, now, subtitle }: { t: T; name: string; now: Date; subtitle: string }) {
  return (
    <header className="mb-8">
      <Label className="mb-2">
        {formatWeekday(now)} · {formatShortDate(now)}
      </Label>
      <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
        {t("dashboard.hello", { greeting: greeting(now), name })}
      </h1>
      <p className="mt-2 text-muted">{subtitle}</p>
    </header>
  );
}

/** Open or closed at a glance, plus unread replies. The full page is the cohort's Office hours tab. */
function OfficeHoursCard({ t, userId, cohortId, now }: { t: T; userId: string; cohortId: string; now: Date }) {
  const status = officeStatus(cohortId, now);
  if (!status.hasSchedule) return null;
  const { title, detail } = officeStatusText(status, now);
  const replies = unreadRepliesFor(cohortId, userId);
  return (
    <Card title={t("dashboard.officeHours")}>
      <p className="flex items-center gap-2 font-semibold">
        <span className={clsx("size-2.5 rounded-full", status.open ? "bg-k-office" : "bg-muted/60")} aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
      {replies > 0 && <p className="mt-3 text-sm font-medium">{t("dashboard.newReplies", { count: replies })}</p>}
      <Link
        href={`/cohorts/${cohortId}/office-hours`}
        className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
      >
        {status.open ? t("dashboard.messageInstructor") : t("dashboard.seeHours")}
      </Link>
    </Card>
  );
}

function ProgressCard({
  t,
  userId,
  cohort,
  week,
  totalWeeks,
}: {
  t: T;
  userId: string;
  cohort: Cohort;
  week: number;
  totalWeeks: number;
}) {
  const p = progressFor(userId, cohort);
  return (
    <Card title={t("dashboard.yourProgress")}>
      <p className="text-5xl font-semibold tracking-tight">{p.percent}%</p>
      <p className="mt-1 mb-4 text-sm text-muted">{t("dashboard.weekOf", { week, total: totalWeeks })}</p>
      <ProgressBar value={p.percent} />
      <ProgressBreakdown progress={p} className="mt-4" />
    </Card>
  );
}

function ContinueLearning({
  t,
  locale,
  userId,
  cohort,
  now,
}: {
  t: T;
  locale: Locale;
  userId: string;
  cohort: Cohort;
  now: Date;
}) {
  const next = nextLessonFor(userId, cohort, now);
  if (!next) {
    return (
      <Card title={t("dashboard.continueLearning")}>
        <p className="font-medium">{t("dashboard.finishedEverything")}</p>
      </Card>
    );
  }
  const { module, total } = next;
  const lesson = loc(next.lesson, locale);
  return (
    <Link
      href={`/cohorts/${cohort.id}/modules/${module.id}/${lesson.id}`}
      className="group flex items-center gap-5 rounded-md border-2 border-ink bg-surface p-5 transition-colors hover:border-accent md:p-6"
    >
      <div className="min-w-0 flex-1">
        <Label>{t("dashboard.continueWhere")}</Label>
        <p className="mt-2 truncate text-xl font-semibold tracking-tight group-hover:text-accent">{lesson.title}</p>
        <p className="mt-1 text-sm text-muted">
          {t("dashboard.continueMeta", {
            week: module.week,
            position: lesson.position,
            total,
            minutes: lesson.durationMin,
          })}
        </p>
      </div>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-ink text-paper transition-colors group-hover:bg-accent group-hover:text-accent-ink">
        <ArrowRight size={18} className="rtl:-scale-x-100" />
      </span>
    </Link>
  );
}

function Tasks({ t, userId, cohortId, now }: { t: T; userId: string; cohortId: string; now: Date }) {
  const all = tasksFor(userId, cohortId, now);
  // Finished work doesn't need attention; it's summarised in one line instead.
  const tasks = all.filter((task) => !task.done);
  const doneCount = all.length - tasks.length;
  return (
    <Card
      title={t("dashboard.yourTasks")}
      action={
        doneCount > 0 ? (
          <span className="text-xs text-muted">{t("dashboard.doneRecently", { count: doneCount })}</span>
        ) : undefined
      }
    >
      {tasks.length === 0 ? (
        <Empty>{t("dashboard.nothingDue")}</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((task) => {
            const overdue = !task.done && task.dueAt < now;
            return (
              <li key={task.id}>
                <Link href={task.href} className="group flex items-center gap-3 py-3">
                  <span
                    className={clsx(
                      "flex size-5 shrink-0 items-center justify-center rounded-[4px] border",
                      task.done ? "border-ink bg-ink text-paper" : "border-muted",
                    )}
                  >
                    {task.done && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span
                    className={clsx("flex-1 text-sm group-hover:text-accent", task.done && "text-muted line-through")}
                  >
                    {task.title}
                  </span>
                  <span className={clsx("font-mono text-xs", overdue ? "text-k-deadline" : "text-muted")}>
                    {task.done ? t("dashboard.done") : overdue ? t("dashboard.overdue") : dueLabel(t, task.dueAt, now)}
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

function InstructorGlance({ t, cohortId, now }: { t: T; cohortId: string; now: Date }) {
  const { students } = cohortRoster(cohortId);
  const recent = cohortAssignments(cohortId)
    .filter((a) => a.dueAt <= addDays(now, 7))
    .slice(-2);
  return (
    <Card title={t("dashboard.submissions")}>
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
function dueLabel(t: T, due: Date, now: Date) {
  const rel = relativeDay(due, now);
  if (rel === t("common.today")) return t("dashboard.dueToday");
  if (rel === t("common.tomorrow")) return t("dashboard.dueTomorrow");
  return t("dashboard.dueOn", { day: rel });
}
