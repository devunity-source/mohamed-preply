import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { CircleCheck, FileText, MessagesSquare, PlayCircle, Wrench } from "lucide-react";
import { Card, Empty, Label, Pill } from "@/components/ui";
import { ResourceList } from "@/components/resource-list";
import {
  cohortAssignments,
  cohortClasses,
  cohortLabs,
  cohortSpaces,
  completedLessonIds,
  modulesFor,
  resourcesForModule,
} from "@/lib/data/repo";
import { LessonDoneToggle } from "@/components/lesson-done-toggle";
import { lessonExcerpt } from "@/lib/lesson-text";
import { formatShortDate, formatTime } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import type { Key } from "@/lib/i18n/translate";
import { loadCohort } from "../../load";

const LESSON_ICON = { reading: FileText, video: PlayCircle, exercise: Wrench };
const KIND_LABEL: Record<keyof typeof LESSON_ICON, Key> = {
  reading: "lessons.kindReadingLower",
  video: "lessons.kindVideoLower",
  exercise: "lessons.kindExerciseLower",
};

export default async function ModulePage({
  params,
  searchParams,
}: PageProps<"/cohorts/[cohortId]/modules/[moduleId]">) {
  const { t, locale } = await getI18n();
  const { moduleId } = await params;
  const { finished } = await searchParams;
  const { user, cohort, role } = await loadCohort(params);
  const entry = modulesFor(cohort.programmeId).find((m) => m.module.id === moduleId);
  if (!entry) notFound();

  const mod = loc(entry.module, locale);
  const lessons = entry.lessons.map((l) => loc(l, locale));
  const done = completedLessonIds(user.id);
  const classes = cohortClasses(cohort.id).filter((c) => c.moduleId === mod.id);
  const labs = cohortLabs(cohort.id).filter((l) => l.moduleId === mod.id);
  const assignments = cohortAssignments(cohort.id).filter((a) => a.moduleId === mod.id);
  const resources = resourcesForModule(mod.id, cohort.id);
  const questions = cohortSpaces(cohort.id).find((s) => s.name === "Questions");
  const now = new Date();

  return (
    <>
      {finished === "1" && lessons.every((l) => done.has(l.id)) && (
        <p
          role="status"
          className="mb-6 flex items-center gap-3 rounded-md border border-k-office bg-k-office/10 p-4 text-sm font-medium"
        >
          <CircleCheck size={18} className="text-k-office" /> {t("lessons.finishedModule")}
        </p>
      )}
      <div className="mb-8">
        <Label className="mb-1">{t("lessons.week", { week: mod.week })}</Label>
        <h2 className="text-2xl font-semibold tracking-tight">{mod.title}</h2>
        <p className="mt-1 text-muted">{mod.summary}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-5 lg:col-span-2">
          <Card title={t("lessons.lessons")}>
            <ol className="divide-y divide-line">
              {lessons.map((l) => {
                const Icon = LESSON_ICON[l.kind];
                const isDone = done.has(l.id);
                return (
                  <li key={l.id} className="flex items-start gap-4 py-4">
                    <Icon size={18} className="mt-0.5 shrink-0 text-muted" />
                    <Link href={`/cohorts/${cohort.id}/modules/${mod.id}/${l.id}`} className="group flex-1">
                      <p className={clsx("font-medium group-hover:text-accent", isDone && "text-muted")}>{l.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{lessonExcerpt(l.body)}</p>
                      <p className="mt-1 font-mono text-[11px] tracking-wider text-muted uppercase">
                        {t(KIND_LABEL[l.kind])} · {t("lessons.minutes", { count: l.durationMin })}
                      </p>
                    </Link>
                    {role === "student" && <LessonDoneToggle lessonId={l.id} done={isDone} />}
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card title={t("lessons.liveClasses")}>
            <ul className="divide-y divide-line">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/cohorts/${cohort.id}/classes/${c.id}`}
                    className="flex items-center gap-4 py-3 hover:text-accent"
                  >
                    <span className="w-24 font-mono text-xs text-muted rtl:w-28">
                      {formatShortDate(c.startsAt)} {formatTime(c.startsAt)}
                    </span>
                    <span className="flex-1 font-medium">{c.title}</span>
                    {c.startsAt < now ? (
                      <Pill tone="quiet">{t("lessons.recorded")}</Pill>
                    ) : (
                      <Pill>{t("lessons.upcoming")}</Pill>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          {labs.map((l) => (
            <Card key={l.id} title={t("lessons.labNumber", { number: String(l.number).padStart(2, "0") })}>
              <p className="font-medium">{l.title}</p>
              <p className="mt-1 text-sm text-muted">{t("lessons.due", { date: formatShortDate(l.dueAt) })}</p>
              <Link
                href={`/cohorts/${cohort.id}/labs#${l.id}`}
                className="mt-3 inline-block text-sm font-medium hover:text-accent"
              >
                {t("lessons.openLab")}
              </Link>
            </Card>
          ))}
          {assignments.map((a) => (
            <Card key={a.id} title={t("lessons.assignment")}>
              <p className="font-medium">{a.title}</p>
              <p className="mt-1 text-sm text-muted">{t("lessons.due", { date: formatShortDate(a.dueAt) })}</p>
              <Link
                href={`/cohorts/${cohort.id}/assignments/${a.id}`}
                className="mt-3 inline-block text-sm font-medium hover:text-accent"
              >
                {t("lessons.openAssignment")}
              </Link>
            </Card>
          ))}
          <Card title={t("lessons.resources")}>
            {resources.length ? <ResourceList resources={resources} /> : <Empty>{t("lessons.noResources")}</Empty>}
          </Card>
          {questions && (
            <Link
              href={`/community/${questions.slug}`}
              className="flex items-center gap-2 rounded-md border border-line p-4 text-sm font-medium hover:border-ink"
            >
              <MessagesSquare size={16} /> {t("lessons.askModule")}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
