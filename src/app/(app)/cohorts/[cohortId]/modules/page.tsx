import Link from "next/link";
import clsx from "clsx";
import { Check } from "lucide-react";
import { Pill } from "@/components/ui";
import { completedLessonIds, cohortWeek, modulesFor } from "@/lib/data/repo";
import { loadCohort } from "../load";

export default async function Modules({ params }: PageProps<"/cohorts/[cohortId]/modules">) {
  const { user, cohort } = await loadCohort(params);
  const done = completedLessonIds(user.id);
  const { week } = cohortWeek(cohort, new Date());

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {modulesFor(cohort.programmeId).map(({ module, lessons }) => {
        const count = lessons.filter((l) => done.has(l.id)).length;
        return (
          <Link
            key={module.id}
            href={`/cohorts/${cohort.id}/modules/${module.id}`}
            className={clsx(
              "group rounded-md border bg-surface p-5 transition-colors hover:border-ink",
              module.week === week ? "border-accent" : "border-line",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-muted">WEEK {module.week}</span>
              {count === lessons.length ? (
                <Pill tone="good">Complete</Pill>
              ) : module.week === week ? (
                <Pill tone="accent">This week</Pill>
              ) : null}
            </div>
            <h2 className="text-xl font-semibold tracking-tight group-hover:text-accent">{module.title}</h2>
            <p className="mt-1 text-sm text-muted">{module.summary}</p>
            <ul className="mt-4 space-y-1.5">
              {lessons.map((l) => (
                <li key={l.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={clsx(
                      "flex size-4 items-center justify-center rounded-[3px] border",
                      done.has(l.id) ? "border-ink bg-ink text-paper" : "border-line",
                    )}
                  >
                    {done.has(l.id) && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className={clsx(done.has(l.id) && "text-muted")}>{l.title}</span>
                </li>
              ))}
            </ul>
          </Link>
        );
      })}
    </div>
  );
}
