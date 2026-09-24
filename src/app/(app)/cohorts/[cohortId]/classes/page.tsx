import Link from "next/link";
import clsx from "clsx";
import { DoneGroup, Empty, Pill } from "@/components/ui";
import { cohortClasses, isLive } from "@/lib/data/repo";
import { formatShortDate, formatTime, formatWeekday } from "@/lib/time";
import type { ClassSession } from "@/lib/types";
import { loadCohort } from "../load";

export default async function Classes({ params }: PageProps<"/cohorts/[cohortId]/classes">) {
  const { cohort } = await loadCohort(params);
  const now = new Date();
  const ended = (c: ClassSession) => c.startsAt.getTime() + c.durationMin * 60_000 < now.getTime();
  const numbered = cohortClasses(cohort.id).map((c, i) => ({ c, n: i + 1 }));
  const upcoming = numbered.filter((x) => !ended(x.c));
  // Most recent recording first: that's the one people go back to.
  const past = numbered.filter((x) => ended(x.c)).reverse();
  const nextId = upcoming[0]?.c.id;

  const row = ({ c, n }: (typeof numbered)[number]) => (
    <li key={c.id}>
      <Link
        href={`/cohorts/${cohort.id}/classes/${c.id}`}
        className={clsx(
          "flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4 hover:bg-paper",
          c.id === nextId && "bg-paper",
        )}
      >
        <span className="w-8 font-mono text-xs font-semibold text-muted">{String(n).padStart(2, "0")}</span>
        <span className="w-36 font-mono text-xs text-muted">
          {formatWeekday(c.startsAt).slice(0, 3)} {formatShortDate(c.startsAt)} · {formatTime(c.startsAt)}
        </span>
        <span className={clsx("flex-1 font-medium", ended(c) && "text-muted")}>{c.title}</span>
        {isLive(c, now) ? (
          <Pill tone="accent">Live now</Pill>
        ) : c.id === nextId ? (
          <Pill tone="accent">Next</Pill>
        ) : ended(c) ? (
          <Pill>{c.recordingUrl ? "Recording" : "Ended"}</Pill>
        ) : null}
      </Link>
    </li>
  );

  return (
    <div className="space-y-5">
      {upcoming.length === 0 ? (
        <Empty>No more live classes in this cohort. Recordings are below.</Empty>
      ) : (
        <ol className="divide-y divide-line rounded-md border border-line bg-surface">{upcoming.map(row)}</ol>
      )}
      <DoneGroup label="Past classes and recordings" count={past.length}>
        <ol className="divide-y divide-line rounded-md border border-line bg-surface">{past.map(row)}</ol>
      </DoneGroup>
    </div>
  );
}
