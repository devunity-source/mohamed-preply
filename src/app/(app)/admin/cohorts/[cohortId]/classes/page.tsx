import Link from "next/link";
import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { ButtonLink, Pill } from "@/components/ui";
import { cohortClasses } from "@/lib/data/repo";
import { deleteClass } from "@/lib/admin-actions";
import { requireCohortManager } from "@/lib/authz";
import { formatShortDate, formatTime, formatWeekday } from "@/lib/time";

export default async function AdminClasses({ params }: PageProps<"/admin/cohorts/[cohortId]/classes">) {
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  const now = new Date();
  const classes = cohortClasses(cohortId);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <ButtonLink href={`/admin/cohorts/${cohortId}/classes/new`}>
          <Plus size={14} /> Schedule a class
        </ButtonLink>
      </div>
      <ol className="divide-y divide-line rounded-md border border-line bg-surface">
        {classes.map((c) => {
          const past = c.startsAt < now;
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3">
              <span className="w-36 font-mono text-xs text-muted">
                {formatWeekday(c.startsAt).slice(0, 3)} {formatShortDate(c.startsAt)} · {formatTime(c.startsAt)}
              </span>
              <Link
                href={`/admin/cohorts/${cohortId}/classes/${c.id}`}
                className={clsx("flex-1 font-medium hover:text-accent", past && "text-muted")}
              >
                {c.title}
              </Link>
              {past ? (
                c.recordingUrl ? (
                  <Pill tone="good">Recorded</Pill>
                ) : (
                  <Pill tone="warn">Needs recording</Pill>
                )
              ) : (
                <form action={deleteClass.bind(null, c.id)}>
                  <button
                    aria-label={`Delete ${c.title}`}
                    className="rounded-md p-1.5 text-muted hover:bg-k-deadline/10 hover:text-k-deadline"
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
