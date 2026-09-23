import Link from "next/link";
import clsx from "clsx";
import { Pill } from "@/components/ui";
import { cohortClasses, isLive } from "@/lib/data/repo";
import { formatShortDate, formatTime, formatWeekday } from "@/lib/time";
import { loadCohort } from "../load";

export default async function Classes({ params }: PageProps<"/cohorts/[cohortId]/classes">) {
  const { cohort } = await loadCohort(params);
  const now = new Date();
  const classes = cohortClasses(cohort.id);
  const nextId = classes.find((c) => c.startsAt.getTime() + c.durationMin * 60_000 > now.getTime())?.id;

  return (
    <ol className="divide-y divide-line rounded-md border border-line bg-surface">
      {classes.map((c, i) => {
        const past = c.startsAt.getTime() + c.durationMin * 60_000 < now.getTime();
        return (
          <li key={c.id}>
            <Link
              href={`/cohorts/${cohort.id}/classes/${c.id}`}
              className={clsx(
                "flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4 hover:bg-paper",
                c.id === nextId && "bg-paper",
              )}
            >
              <span className="w-8 font-mono text-xs font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="w-36 font-mono text-xs text-muted">
                {formatWeekday(c.startsAt).slice(0, 3)} {formatShortDate(c.startsAt)} · {formatTime(c.startsAt)}
              </span>
              <span className={clsx("flex-1 font-medium", past && "text-muted")}>{c.title}</span>
              {isLive(c, now) ? (
                <Pill tone="accent">Live now</Pill>
              ) : c.id === nextId ? (
                <Pill tone="accent">Next</Pill>
              ) : past ? (
                <Pill>Recording</Pill>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
