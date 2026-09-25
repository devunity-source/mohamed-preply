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
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import type { Key } from "@/lib/i18n/translate";
import { rich } from "@/components/rich";
import { loadCohort } from "../../../load";

const KIND: Record<"reading" | "video" | "exercise", { icon: typeof FileText; label: Key }> = {
  reading: { icon: FileText, label: "lessons.kindReading" },
  video: { icon: PlayCircle, label: "lessons.kindVideo" },
  exercise: { icon: Wrench, label: "lessons.kindExercise" },
};

export default async function LessonPage({ params }: PageProps<"/cohorts/[cohortId]/modules/[moduleId]/[lessonId]">) {
  const { t, locale } = await getI18n();
  const { moduleId, lessonId } = await params;
  const { user, cohort, role } = await loadCohort(params);
  const ctx = lessonContext(cohort.programmeId, lessonId);
  if (!ctx || ctx.module.id !== moduleId) notFound();

  const { indexInModule } = ctx;
  const mod = loc(ctx.module, locale);
  const lesson = loc(ctx.lesson, locale);
  const siblings = ctx.siblings.map((l) => loc(l, locale));
  const prev = ctx.prev && loc(ctx.prev, locale);
  const next = ctx.next && loc(ctx.next, locale);
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
          href={`${base}/${mod.id}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={14} className="rtl:-scale-x-100" />{" "}
          {t("lessons.weekAndTitle", { week: mod.week, title: mod.title })}
        </Link>
        <p className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted uppercase">
          <Icon size={14} /> {t("lessons.lessonOf", { n: indexInModule + 1, total: siblings.length })} · {t(kindLabel)}{" "}
          · {t("lessons.minutes", { count: lesson.durationMin })}
        </p>
        <h2 className="mt-2 mb-8 text-3xl font-semibold tracking-tight md:text-4xl">{lesson.title}</h2>

        {lesson.kind === "video" && (
          <div className="mb-8 flex aspect-video items-center justify-center rounded-xl border border-line bg-dusk text-ink">
            <div className="text-center">
              <PlayCircle size={48} strokeWidth={1.25} className="mx-auto opacity-70" />
              <p className="mt-3 text-sm opacity-70">{t("lessons.videoPlaceholder")}</p>
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
              <ArrowLeft size={14} className="rtl:-scale-x-100" />{" "}
              <span className="max-w-48 truncate">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {student && !isDone ? (
            <form action={completeLessonAndContinue.bind(null, cohort.id, lesson.id)}>
              <SubmitButton variant="accent" pendingLabel={t("lessons.saving")}>
                {next ? t("lessons.markDoneContinue") : t("lessons.markDoneFinish")}{" "}
                <ArrowRight size={16} className="rtl:-scale-x-100" />
              </SubmitButton>
            </form>
          ) : next ? (
            <Link
              href={href(next)}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-accent hover:text-accent-ink"
            >
              {rich(t("lessons.next", { title: next.title }), {
                name: (c) => <span className="max-w-56 truncate">{c}</span>,
              })}{" "}
              <ArrowRight size={16} className="rtl:-scale-x-100" />
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
        <Card title={t("lessons.week", { week: mod.week })}>
          <p className="mb-3 font-medium">{mod.title}</p>
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
            <MessagesSquare size={16} /> {t("lessons.stuck")}
          </Link>
        )}
      </aside>
    </div>
  );
}
