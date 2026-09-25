import { Card, Empty, ProgressBar } from "@/components/ui";
import { ProjectCard } from "@/components/project-card";
import { cohortProjects, projectForUser } from "@/lib/data/admin";
import { canManageCohort } from "@/lib/authz";
import { getI18n } from "@/lib/i18n/server";
import { loadCohort } from "../load";

export default async function Projects({ params }: PageProps<"/cohorts/[cohortId]/projects">) {
  const { t } = await getI18n();
  const { user, cohort } = await loadCohort(params);
  const now = new Date();
  const mine = projectForUser(user.id, cohort.id);
  const all = cohortProjects(cohort.id);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
      <div className="lg:col-span-2">
        {mine ? (
          <ProjectCard view={mine} canEdit now={now} />
        ) : canManageCohort(user, cohort.id) ? (
          <Empty>{t("projects.teachEmpty")}</Empty>
        ) : (
          <Empty>{t("projects.noTeam")}</Empty>
        )}
        {mine && <p className="mt-3 text-xs text-muted">{t("projects.tickHint")}</p>}
      </div>
      <Card title={t("projects.allTeams", { count: all.length })}>
        {all.length === 0 ? (
          <p className="text-sm text-muted">{t("projects.noTeams")}</p>
        ) : (
          <ul className="space-y-4">
            {all.map(({ project, members, progress }) => (
              <li key={project.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {project.teamName}
                    {project.id === mine?.project.id && <span className="ms-1.5 text-accent">{t("projects.you")}</span>}
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
