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
import { loadCohort } from "../../load";

const LESSON_ICON = { reading: FileText, video: PlayCircle, exercise: Wrench };

export default async function ModulePage({
  params,
  searchParams,
}: PageProps<"/cohorts/[cohortId]/modules/[moduleId]">) {
  const { moduleId } = await params;
  const { finished } = await searchParams;
  const { user, cohort, role } = await loadCohort(params);
  const entry = modulesFor(cohort.programmeId).find((m) => m.module.id === moduleId);
  if (!entry) notFound();

  const { module, lessons } = entry;
  const done = completedLessonIds(user.id);
  const classes = cohortClasses(cohort.id).filter((c) => c.moduleId === module.id);
  const labs = cohortLabs(cohort.id).filter((l) => l.moduleId === module.id);
  const assignments = cohortAssignments(cohort.id).filter((a) => a.moduleId === module.id);
  const resources = resourcesForModule(module.id, cohort.id);
  const questions = cohortSpaces(cohort.id).find((s) => s.name === "Questions");
  const now = new Date();

  return (
    <>
      {finished === "1" && lessons.every((l) => done.has(l.id)) && (
        <p
          role="status"
          className="mb-6 flex items-center gap-3 rounded-md border border-k-office bg-k-office/10 p-4 text-sm font-medium"
        >
          <CircleCheck size={18} className="text-k-office" /> You&apos;ve finished every lesson in this module.
        </p>
      )}
      <div className="mb-8">
        <Label className="mb-1">Week {module.week}</Label>
        <h2 className="text-2xl font-semibold tracking-tight">{module.title}</h2>
        <p className="mt-1 text-muted">{module.summary}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Lessons">
            <ol className="divide-y divide-line">
              {lessons.map((l) => {
                const Icon = LESSON_ICON[l.kind];
                const isDone = done.has(l.id);
                return (
                  <li key={l.id} className="flex items-start gap-4 py-4">
                    <Icon size={18} className="mt-0.5 shrink-0 text-muted" />
                    <Link href={`/cohorts/${cohort.id}/modules/${module.id}/${l.id}`} className="group flex-1">
                      <p className={clsx("font-medium group-hover:text-accent", isDone && "text-muted")}>{l.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{lessonExcerpt(l.body)}</p>
                      <p className="mt-1 font-mono text-[11px] tracking-wider text-muted uppercase">
                        {l.kind} · {l.durationMin} min
                      </p>
                    </Link>
                    {role === "student" && <LessonDoneToggle lessonId={l.id} done={isDone} />}
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card title="Live classes">
            <ul className="divide-y divide-line">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/cohorts/${cohort.id}/classes/${c.id}`}
                    className="flex items-center gap-4 py-3 hover:text-accent"
                  >
                    <span className="w-24 font-mono text-xs text-muted">
                      {formatShortDate(c.startsAt)} {formatTime(c.startsAt)}
                    </span>
                    <span className="flex-1 font-medium">{c.title}</span>
                    {c.startsAt < now ? <Pill tone="quiet">Recorded</Pill> : <Pill>Upcoming</Pill>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          {labs.map((l) => (
            <Card key={l.id} title={`Lab #${String(l.number).padStart(2, "0")}`}>
              <p className="font-medium">{l.title}</p>
              <p className="mt-1 text-sm text-muted">Due {formatShortDate(l.dueAt)}</p>
              <Link
                href={`/cohorts/${cohort.id}/labs#${l.id}`}
                className="mt-3 inline-block text-sm font-medium hover:text-accent"
              >
                Open lab →
              </Link>
            </Card>
          ))}
          {assignments.map((a) => (
            <Card key={a.id} title="Assignment">
              <p className="font-medium">{a.title}</p>
              <p className="mt-1 text-sm text-muted">Due {formatShortDate(a.dueAt)}</p>
              <Link
                href={`/cohorts/${cohort.id}/assignments/${a.id}`}
                className="mt-3 inline-block text-sm font-medium hover:text-accent"
              >
                Open assignment →
              </Link>
            </Card>
          ))}
          <Card title="Resources">
            {resources.length ? <ResourceList resources={resources} /> : <Empty>No resources yet.</Empty>}
          </Card>
          {questions && (
            <Link
              href={`/community/${questions.slug}`}
              className="flex items-center gap-2 rounded-md border border-line p-4 text-sm font-medium hover:border-ink"
            >
              <MessagesSquare size={16} /> Ask a question about this module
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
