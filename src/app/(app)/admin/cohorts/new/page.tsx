import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { ActionForm, field } from "@/components/admin-forms";
import { createCohort } from "@/lib/admin-actions";
import { listProfiles, listProgrammes } from "@/lib/data/repo";
import { requireAdmin } from "@/lib/authz";
import { zonedParts } from "@/lib/time";

export const metadata = { title: "New cohort" };

export default async function NewCohort({ searchParams }: PageProps<"/admin/cohorts/new">) {
  await requireAdmin();
  const { programme } = await searchParams;
  const programmes = listProgrammes();
  const staff = listProfiles().filter((p) => p.role === "instructor" || p.role === "admin");
  const t = zonedParts(new Date());
  const today = `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
  const preselect = programmes.some((p) => p.id === programme) ? String(programme) : programmes[0]?.id;

  return (
    <>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} /> Admin
      </Link>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">New cohort</h1>
      <p className="mb-6 max-w-2xl text-muted">
        One run of a programme. It gets the next cohort number, its own community spaces, and an end date based on the
        programme&apos;s length.
      </p>

      <Card className="max-w-2xl">
        <ActionForm action={createCohort} submitLabel="Create cohort">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Programme</span>
            <select name="programmeId" defaultValue={preselect} required className={field}>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.durationWeeks} weeks){p.published ? "" : " · draft"}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Start date (UAE time)</span>
              <input name="startsOn" type="date" min={today} required className={field} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Instructor</span>
              <select name="instructorId" required className={field}>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.role})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted">
            The instructor is notified and sees the cohort under Admin straight away. Students join through enrolment.
          </p>
        </ActionForm>
      </Card>
    </>
  );
}
