import clsx from "clsx";
import { Check, GitBranch } from "lucide-react";
import { Avatar, Card, ProgressBar } from "@/components/ui";
import { ActionForm, field } from "@/components/admin-forms";
import { setProjectRepo, toggleMilestone } from "@/lib/admin-actions";
import type { ProjectView } from "@/lib/data/admin";
import { formatFull, formatShortDate, formatTime } from "@/lib/time";
import { SubmitButton } from "@/components/submit-button";

/** Shared by the student project page and the admin projects tab. */
export function ProjectCard({
  view,
  canEdit,
  now,
  children,
}: {
  view: ProjectView;
  canEdit: boolean;
  now: Date;
  children?: React.ReactNode;
}) {
  const { project, members, milestones, progress } = view;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-wider text-muted uppercase">{project.title}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">{project.teamName}</h3>
        </div>
        <span className="font-mono text-2xl font-semibold">{progress}%</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={progress} segments={milestones.length || 1} />
      </div>

      <ul className="mt-5 flex flex-wrap gap-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-md border border-line py-1 pr-3 pl-1 text-sm">
            <Avatar profile={m} size={22} /> {m.fullName}
          </li>
        ))}
      </ul>

      <ol className="mt-5 space-y-1.5">
        {milestones.map((ms) => {
          const overdue = !ms.doneAt && ms.dueOn < now;
          const box = (
            <span
              className={clsx(
                "flex size-5 shrink-0 items-center justify-center rounded-[4px] border",
                ms.doneAt ? "border-ink bg-ink text-paper" : "border-muted",
              )}
            >
              {ms.doneAt && <Check size={12} strokeWidth={3} />}
            </span>
          );
          const label = (
            <>
              <span className={clsx("flex-1", ms.doneAt && "text-muted line-through")}>{ms.title}</span>
              <span className={clsx("font-mono text-xs", overdue ? "text-k-deadline" : "text-muted")}>
                {formatShortDate(ms.dueOn)} {formatTime(ms.dueOn)}
              </span>
            </>
          );
          return (
            <li key={ms.id}>
              {canEdit ? (
                <form action={toggleMilestone.bind(null, ms.id)}>
                  <SubmitButton
                    unstyled
                    aria-pressed={!!ms.doneAt}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-paper"
                  >
                    {box}
                    {label}
                  </SubmitButton>
                </form>
              ) : (
                <div className="flex items-center gap-3 py-1.5 text-sm">
                  {box}
                  {label}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
        <p>
          <span className="text-muted">Presentation: </span>
          {project.presentsAt ? formatFull(project.presentsAt) : "not scheduled yet"}
        </p>
        {canEdit ? (
          <ActionForm action={setProjectRepo} submitLabel="Save repo" className="max-w-xl">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="flex items-center gap-2">
              <GitBranch size={14} className="shrink-0 text-muted" />
              <span className="sr-only">Repository</span>
              <input
                name="repoUrl"
                type="url"
                placeholder="https://github.com/your-team/capstone"
                defaultValue={project.repoUrl ?? ""}
                className={clsx(field, "font-mono")}
              />
            </label>
          </ActionForm>
        ) : project.repoUrl ? (
          <a href={project.repoUrl} target="_blank" rel="noreferrer" className="font-mono underline">
            {project.repoUrl}
          </a>
        ) : (
          <p className="text-muted">No repository linked yet.</p>
        )}
      </div>
      {children}
    </Card>
  );
}
