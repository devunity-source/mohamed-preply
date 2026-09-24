import Link from "next/link";
import { notFound } from "next/navigation";
import { Label } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { AtPath } from "@/components/path-switch";
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
  { href: "office-hours", label: "Office hours" },
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

  const base = `/cohorts/${cohort.id}`;
  const when = cohort.status === "active" ? `Week ${week} of ${totalWeeks}` : cohort.status;

  const full = (
    <header className="mb-6">
      <Label className="mb-2">
        {programme.title} · Cohort {cohort.code}
      </Label>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{cohort.name}</h1>
      <p className="mt-2 text-sm text-muted">
        {formatShortDate(cohort.startsOn)} to {formatShortDate(cohort.endsOn)} · {when} · {students.length} students
        {instructors[0] && ` · ${instructors[0].fullName}`}
      </p>
    </header>
  );
  // Inner tabs already say where you are; one line keeps the content above the fold.
  const compact = (
    <header className="mb-4">
      <Link href={base} className="text-sm text-muted hover:text-ink">
        <span className="font-medium text-ink">{cohort.name}</span> · {when}
      </Link>
    </header>
  );

  return (
    <>
      <div className="print:hidden">
        <AtPath path={base} match={full} other={compact} />
      </div>
      <Tabs base={base} items={TABS} />
      {children}
    </>
  );
}
