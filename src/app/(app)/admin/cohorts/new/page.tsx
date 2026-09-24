import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { ActionForm, field } from "@/components/admin-forms";
import { createCohort } from "@/lib/admin-actions";
import { listProfiles, listProgrammes } from "@/lib/data/repo";
import { requireAdmin } from "@/lib/authz";
import { zonedParts } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("admin.newCohortTitle") };
}

export default async function NewCohort({ searchParams }: PageProps<"/admin/cohorts/new">) {
  const { t, locale } = await getI18n();
  await requireAdmin();
  const { programme } = await searchParams;
  const programmes = listProgrammes();
  const staff = listProfiles().filter((p) => p.role === "instructor" || p.role === "admin");
  const now = zonedParts(new Date());
  const today = `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;
  const preselect = programmes.some((p) => p.id === programme) ? String(programme) : programmes[0]?.id;

  return (
    <>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} className="rtl:-scale-x-100" /> {t("admin.backToAdmin")}
      </Link>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">{t("admin.newCohortTitle")}</h1>
      <p className="mb-6 max-w-2xl text-muted">{t("admin.newCohortIntro")}</p>

      <Card className="max-w-2xl">
        <ActionForm action={createCohort} submitLabel={t("admin.createCohort")}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("admin.programme")}</span>
            <select name="programmeId" defaultValue={preselect} required className={field}>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${t("admin.programmeOption", { title: loc(p, locale).title, count: p.durationWeeks })}${p.published ? "" : t("admin.draftSuffix")}`}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("admin.startDate")}</span>
              <input name="startsOn" type="date" min={today} required className={field} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("admin.instructor")}</span>
              <select name="instructorId" required className={field}>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t("admin.staffOption", {
                      name: p.fullName,
                      role: p.role === "admin" ? t("admin.roleAdmin") : t("admin.roleInstructor"),
                    })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted">{t("admin.instructorNote")}</p>
        </ActionForm>
      </Card>
    </>
  );
}
