import clsx from "clsx";
import { Check, Clock, Play, Send } from "lucide-react";
import { Button, Label, Pill } from "@/components/ui";
import { cohortLabs, labStatus } from "@/lib/data/repo";
import { updateLab } from "@/lib/actions";
import { formatShortDate, formatTime, relativeDay } from "@/lib/time";
import type { LabStatus } from "@/lib/types";
import { loadCohort } from "../load";

const STATUS: Record<LabStatus, { label: string; tone: "neutral" | "warn" | "accent" | "good" }> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "warn" },
  submitted: { label: "Submitted", tone: "accent" },
  passed: { label: "Passed", tone: "good" },
};

export default async function Labs({ params }: PageProps<"/cohorts/[cohortId]/labs">) {
  const { user, cohort, role } = await loadCohort(params);
  const now = new Date();

  return (
    <div className="space-y-5">
      {cohortLabs(cohort.id).map((lab) => {
        const status = labStatus(user.id, lab.id);
        const overdue = lab.dueAt < now && (status === "not_started" || status === "in_progress");
        return (
          <article key={lab.id} id={lab.id} className="scroll-mt-24 rounded-md border border-line bg-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Label>Lab #{String(lab.number).padStart(2, "0")}</Label>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{lab.title}</h2>
              </div>
              {role === "student" && (
                <Pill tone={overdue ? "bad" : STATUS[status].tone}>{overdue ? "Overdue" : STATUS[status].label}</Pill>
              )}
            </div>

            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <dt className="tracking-wider text-muted uppercase">Difficulty</dt>
                <dd className="flex gap-0.5" aria-label={`${lab.difficulty} of 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={clsx("size-2.5 rounded-[2px]", i < lab.difficulty ? "bg-ink" : "bg-line")}
                    />
                  ))}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-muted" />
                <dd>~{lab.estMinutes} min</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="tracking-wider text-muted uppercase">Due</dt>
                <dd className={clsx(overdue && "text-k-deadline")}>
                  {lab.dueAt > now ? relativeDay(lab.dueAt, now) : formatShortDate(lab.dueAt)} · {formatTime(lab.dueAt)}
                </dd>
              </div>
            </dl>

            <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
              {lab.objectives.map((o) => (
                <li key={o} className="flex items-center gap-2 text-sm">
                  <Check size={14} className={status === "passed" ? "text-k-office" : "text-muted"} strokeWidth={3} />
                  {o}
                </li>
              ))}
            </ul>

            {role === "student" && (status === "not_started" || status === "in_progress") && (
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                {status === "not_started" ? (
                  <form action={updateLab.bind(null, lab.id, "in_progress")}>
                    <Button>
                      <Play size={14} /> Start lab environment
                    </Button>
                  </form>
                ) : (
                  <form action={updateLab.bind(null, lab.id, "submitted")}>
                    <Button variant="accent">
                      <Send size={14} /> Submit lab
                    </Button>
                  </form>
                )}
                <p className="text-xs text-muted">
                  {status === "not_started"
                    ? "Sandboxed cloud environments arrive in a later phase. For now, use your own subscription."
                    : "Submit once every objective works end to end."}
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
