import { notFound } from "next/navigation";
import { Label } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { cohortForUser, cohortRoster, cohortWeek } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";
import { formatShortDate } from "@/lib/time";

const TABS = [
  { href: "", label: "Overview" },
  { href: "schedule", label: "Schedule" },
  { href: "modules", label: "Modules" },
  { href: "classes", label: "Classes" },
  { href: "labs", label: "Labs" },
  { href: "assignments", label: "Assignments" },
  { href: "projects", label: "Projects" },
  { href: "certificate", label: "Certificate" },
];

export default async function CohortLayout({ children, params }: LayoutProps<"/cohorts/[cohortId]">) {
  const { cohortId } = await params;
  const user = await currentUser();
  const summary = cohortForUser(cohortId, user.id);
  if (!summary) notFound();

  const { cohort, programme } = summary;
  const { week, totalWeeks } = cohortWeek(cohort, new Date());
  const { instructors, students } = cohortRoster(cohort.id);

  return (
    <>
      <header className="mb-6 print:hidden">
        <Label className="mb-2">
          {programme.title} · Cohort {cohort.code}
        </Label>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{cohort.name}</h1>
        <p className="mt-2 font-mono text-xs tracking-wider text-muted uppercase">
          {formatShortDate(cohort.startsOn)} to {formatShortDate(cohort.endsOn)}
          {" · "}
          {cohort.status === "active" ? `Week ${week} of ${totalWeeks}` : cohort.status}
          {" · "}
          {students.length} students
          {instructors[0] && ` · ${instructors[0].fullName}`}
        </p>
      </header>
      <Tabs base={`/cohorts/${cohort.id}`} items={TABS} />
      {children}
    </>
  );
}
