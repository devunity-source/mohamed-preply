import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check, FileText, MessagesSquare, PlayCircle, Wrench } from "lucide-react";
import { Card } from "@/components/ui";
import { LessonBody } from "@/components/lesson-body";
import { LessonDoneToggle } from "@/components/lesson-done-toggle";
import { SubmitButton } from "@/components/submit-button";
import { cohortSpaces, completedLessonIds, lessonContext } from "@/lib/data/repo";
import { completeLessonAndContinue } from "@/lib/actions";
import { loadCohort } from "../../../load";

const KIND = {
  reading: { icon: FileText, label: "Reading" },
  video: { icon: PlayCircle, label: "Video" },
  exercise: { icon: Wrench, label: "Exercise" },
};

export default async function LessonPage({ params }: PageProps<"/cohorts/[cohortId]/modules/[moduleId]/[lessonId]">) {
  const { moduleId, lessonId } = await params;
  const { user, cohort, role } = await loadCohort(params);
  const ctx = lessonContext(cohort.programmeId, lessonId);
  if (!ctx || ctx.module.id !== moduleId) notFound();

  const { module, lesson, siblings, indexInModule, prev, next } = ctx;
  const done = completedLessonIds(user.id);
  const isDone = done.has(lesson.id);
  const student = role === "student";
  const base = `/cohorts/${cohort.id}/modules`;
  const href = (l: { id: string; moduleId: string }) => `${base}/${l.moduleId}/${l.id}`;
  const questions = cohortSpaces(cohort.id).find((s) => s.name === "Questions");
  const { icon: Icon, label: kindLabel } = KIND[lesson.kind];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <article className="min-w-0">
        <Link
          href={`${base}/${module.id}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Week {module.week} · {module.title}
        </Link>
        <p className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted uppercase">
          <Icon size={14} /> Lesson {indexInModule + 1} of {siblings.length} · {kindLabel} · {lesson.durationMin} min
        </p>
        <h2 className="mt-2 mb-8 text-3xl font-semibold tracking-tight md:text-4xl">{lesson.title}</h2>

        {lesson.kind === "video" && (
          <div className="mb-8 flex aspect-video items-center justify-center rounded-md bg-ink text-paper">
            <div className="text-center">
              <PlayCircle size={48} strokeWidth={1.25} className="mx-auto opacity-70" />
              <p className="mt-3 text-sm opacity-70">The video plays here once a video host is connected.</p>
            </div>
          </div>
        )}

        <div className="max-w-2xl">
          <LessonBody source={lesson.body} />
        </div>

        {/* The one obvious next step, at the end of the reading. */}
        <div className="mt-12 flex max-w-2xl flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          {prev ? (
            <Link href={href(prev)} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
              <ArrowLeft size={14} /> <span className="max-w-48 truncate">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {student && !isDone ? (
            <form action={completeLessonAndContinue.bind(null, cohort.id, lesson.id)}>
              <SubmitButton variant="accent" pendingLabel="Saving…">
                {next ? "Mark done and continue" : "Mark done and finish"} <ArrowRight size={16} />
              </SubmitButton>
            </form>
          ) : next ? (
            <Link
              href={href(next)}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-accent hover:text-accent-ink"
            >
              Next: <span className="max-w-56 truncate">{next.title}</span> <ArrowRight size={16} />
            </Link>
          ) : null}
        </div>
        {student && isDone && (
          <div className="mt-4 max-w-2xl">
            <LessonDoneToggle lessonId={lesson.id} done={isDone} variant="link" />
          </div>
        )}
      </article>

      <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
        <Card title={`Week ${module.week}`}>
          <p className="mb-3 font-medium">{module.title}</p>
          <ol className="space-y-1">
            {siblings.map((l) => (
              <li key={l.id}>
                <Link
                  href={href(l)}
                  aria-current={l.id === lesson.id ? "page" : undefined}
                  className={clsx(
                    "-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                    l.id === lesson.id ? "bg-paper font-medium" : "hover:bg-paper",
                  )}
                >
                  <span
                    className={clsx(
                      "flex size-4 shrink-0 items-center justify-center rounded-[3px] border",
                      done.has(l.id) ? "border-ink bg-ink text-paper" : "border-line",
                    )}
                  >
                    {done.has(l.id) && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className={clsx("flex-1", done.has(l.id) && l.id !== lesson.id && "text-muted")}>
                    {l.title}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
        {questions && (
          <Link
            href={`/community/${questions.slug}`}
            className="flex items-center gap-2 rounded-md border border-line p-4 text-sm font-medium hover:border-ink"
          >
            <MessagesSquare size={16} /> Stuck? Ask your cohort
          </Link>
        )}
      </aside>
    </div>
  );
}
