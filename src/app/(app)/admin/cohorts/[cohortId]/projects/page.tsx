import { X } from "lucide-react";
import { Avatar, Card, Empty } from "@/components/ui";
import { ActionForm, field } from "@/components/admin-forms";
import { ProjectCard } from "@/components/project-card";
import { cohortProjects, unassignedStudents } from "@/lib/data/admin";
import { createProject, removeProjectMember, updateProject } from "@/lib/admin-actions";
import { requireCohortManager } from "@/lib/authz";
import { zonedParts } from "@/lib/time";
import { SubmitButton } from "@/components/submit-button";
import { getI18n } from "@/lib/i18n/server";

const pad = (n: number) => String(n).padStart(2, "0");

export default async function AdminProjects({ params }: PageProps<"/admin/cohorts/[cohortId]/projects">) {
  const { t } = await getI18n();
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  const now = new Date();
  const projects = cohortProjects(cohortId);
  const free = unassignedStudents(cohortId);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
      <div className="space-y-5">
        {projects.length === 0 && <Empty>{t("teaching.noTeams")}</Empty>}
        {projects.map((view) => {
          const p = zonedParts(view.project.presentsAt ?? now);
          return (
            <ProjectCard key={view.project.id} view={view} canEdit now={now}>
              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-medium">{t("teaching.manageTeam")}</summary>
                <div className="mt-4 space-y-4">
                  <ul className="flex flex-wrap gap-2">
                    {view.members.map((m) => (
                      <li key={m.id}>
                        <form action={removeProjectMember.bind(null, view.project.id, m.id)}>
                          <SubmitButton
                            unstyled
                            className="flex items-center gap-1.5 rounded-md border border-line py-1 ps-1 pe-2 text-xs hover:border-k-deadline hover:text-k-deadline"
                          >
                            <Avatar profile={m} size={18} /> {m.fullName} <X size={12} />
                          </SubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <ActionForm action={updateProject} submitLabel={t("teaching.saveTeam")}>
                    <input type="hidden" name="projectId" value={view.project.id} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block text-sm sm:col-span-3">
                        <span className="mb-1 block font-medium">{t("teaching.teamName")}</span>
                        <input name="teamName" required defaultValue={view.project.teamName} className={field} />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">{t("teaching.presentationDate")}</span>
                        <input
                          name="date"
                          type="date"
                          defaultValue={view.project.presentsAt ? `${p.year}-${pad(p.month)}-${pad(p.day)}` : ""}
                          className={field}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">{t("teaching.time")}</span>
                        <input
                          name="time"
                          type="time"
                          defaultValue={view.project.presentsAt ? `${pad(p.hour)}:${pad(p.minute)}` : ""}
                          className={field}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">{t("teaching.addStudent")}</span>
                        <select name="addMember" defaultValue="" className={field} disabled={free.length === 0}>
                          <option value="">{free.length ? t("teaching.choose") : t("teaching.everyoneOnATeam")}</option>
                          {free.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.fullName}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </ActionForm>
                </div>
              </details>
            </ProjectCard>
          );
        })}
      </div>

      <Card title={t("teaching.newTeam")} className="self-start">
        {free.length === 0 ? (
          <p className="text-sm text-muted">{t("teaching.allOnTeams")}</p>
        ) : (
          <ActionForm action={createProject} submitLabel={t("teaching.createTeam")} resetOnSuccess>
            <input type="hidden" name="cohortId" value={cohortId} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("teaching.teamName")}</span>
              <input
                name="teamName"
                required
                maxLength={80}
                placeholder={t("teaching.teamNamePlaceholder")}
                className={field}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("teaching.projectTitle")}</span>
              <input
                name="title"
                maxLength={140}
                placeholder={t("teaching.projectTitlePlaceholder")}
                className={field}
              />
            </label>
            <fieldset className="text-sm">
              <legend className="mb-1 font-medium">{t("teaching.members")}</legend>
              <ul className="space-y-1">
                {free.map((s) => (
                  <li key={s.id}>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="members" value={s.id} className="accent-[var(--accent)]" />
                      {s.fullName}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
