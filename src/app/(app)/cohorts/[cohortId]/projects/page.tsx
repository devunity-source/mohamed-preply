import { Card, Empty, ProgressBar } from "@/components/ui";
import { ProjectCard } from "@/components/project-card";
import { cohortProjects, projectForUser } from "@/lib/data/admin";
import { canManageCohort } from "@/lib/authz";
import { loadCohort } from "../load";

export default async function Projects({ params }: PageProps<"/cohorts/[cohortId]/projects">) {
  const { user, cohort } = await loadCohort(params);
  const now = new Date();
  const mine = projectForUser(user.id, cohort.id);
  const all = cohortProjects(cohort.id);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {mine ? (
          <ProjectCard view={mine} canEdit now={now} />
        ) : canManageCohort(user, cohort.id) ? (
          <Empty>You teach this cohort. Manage teams in Admin → Projects.</Empty>
        ) : (
          <Empty>You haven&apos;t been placed on a capstone team yet. Your instructor sets teams before week 5.</Empty>
        )}
        {mine && <p className="mt-3 text-xs text-muted">Tick milestones as your team finishes them.</p>}
      </div>
      <Card title={`All teams · ${all.length}`}>
        {all.length === 0 ? (
          <p className="text-sm text-muted">No teams yet.</p>
        ) : (
          <ul className="space-y-4">
            {all.map(({ project, members, progress }) => (
              <li key={project.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {project.teamName}
                    {project.id === mine?.project.id && <span className="ml-1.5 text-accent">(you)</span>}
                  </span>
                  <span className="font-mono text-xs">{progress}%</span>
                </div>
                <ProgressBar value={progress} segments={12} />
                <p className="mt-1 text-xs text-muted">{members.map((m) => m.fullName.split(" ")[0]).join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
