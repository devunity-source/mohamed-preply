import Link from "next/link";
import clsx from "clsx";
import { Check } from "lucide-react";
import { Avatar, Card, ProgressBar } from "@/components/ui";
import { cohortRoster, cohortWeek, modulesFor, progressFor } from "@/lib/data/repo";
import { loadCohort } from "./load";

export default async function CohortOverview({ params }: PageProps<"/cohorts/[cohortId]">) {
  const { user, cohort, programme, role } = await loadCohort(params);
  const { week } = cohortWeek(cohort, new Date());
  const { instructors, students } = cohortRoster(cohort.id);
  const progress = role === "student" ? progressFor(user.id, cohort) : null;
  const modules =
    progress?.modules ?? modulesFor(cohort.programmeId).map((m) => ({ ...m, status: "not_started" as const }));

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card title="About this programme">
          <p className="text-lg leading-relaxed">{programme.description}</p>
        </Card>

        <Card title="Curriculum">
          <ol className="divide-y divide-line">
            {modules.map(({ module, status }) => (
              <li key={module.id}>
                <Link
                  href={`/cohorts/${cohort.id}/modules/${module.id}`}
                  className="group flex items-center gap-4 py-3"
                >
                  <span
                    className={clsx(
                      "flex size-8 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold",
                      status === "done" && "bg-ink text-paper",
                      status === "in_progress" && "bg-accent text-accent-ink",
                      status === "not_started" && "border border-line text-muted",
                      module.week === week &&
                        status !== "done" &&
                        "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                    )}
                  >
                    {status === "done" ? <Check size={14} strokeWidth={3} /> : `W${module.week}`}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium group-hover:text-accent">{module.title}</span>
                    <span className="block text-sm text-muted">{module.summary}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="space-y-5">
        {progress && (
          <Card title="Your progress">
            <p className="mb-3 text-4xl font-semibold tracking-tight">{progress.percent}%</p>
            <ProgressBar value={progress.percent} />
          </Card>
        )}

        <Card title="Instructor">
          {instructors.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <Avatar profile={p} size={40} />
              <div>
                <p className="font-medium">{p.fullName}</p>
                <p className="text-sm text-muted">{p.headline}</p>
              </div>
            </div>
          ))}
        </Card>

        <Card title={`Classmates · ${students.length}`}>
          <ul className="grid grid-cols-6 gap-2">
            {students.map((p) => (
              <li key={p.id} title={p.fullName}>
                <Avatar profile={p} size={36} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Included">
          <ul className="space-y-1.5 text-sm">
            {programme.includes.map((i) => (
              <li key={i} className="flex items-center gap-2">
                <Check size={14} className="text-accent" strokeWidth={3} /> {i}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
