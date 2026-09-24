import Link from "next/link";
import { notFound } from "next/navigation";
import { Label } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { AtPath } from "@/components/path-switch";
import { cohortForUser, cohortRoster, cohortWeek } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";
import { formatShortDate } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import type { Key } from "@/lib/i18n/translate";

const TABS: { href: string; label: Key }[] = [
  { href: "", label: "cohort.tabOverview" },
  { href: "schedule", label: "cohort.tabSchedule" },
  { href: "modules", label: "cohort.tabModules" },
  { href: "classes", label: "cohort.tabClasses" },
  { href: "labs", label: "cohort.tabLabs" },
  { href: "assignments", label: "cohort.tabAssignments" },
  { href: "office-hours", label: "cohort.tabOfficeHours" },
  { href: "projects", label: "cohort.tabProjects" },
  { href: "certificate", label: "cohort.tabCertificate" },
];

const STATUS: Record<"upcoming" | "completed" | "active", Key> = {
  active: "cohort.statusActive",
  upcoming: "cohort.statusUpcoming",
  completed: "cohort.statusCompleted",
};

export default async function CohortLayout({ children, params }: LayoutProps<"/cohorts/[cohortId]">) {
  const { t, locale } = await getI18n();
  const { cohortId } = await params;
  const user = await currentUser();
  const summary = cohortForUser(cohortId, user.id);
  if (!summary) notFound();

  const { cohort } = summary;
  const programme = loc(summary.programme, locale);
  const { week, totalWeeks } = cohortWeek(cohort, new Date());
  const { instructors, students } = cohortRoster(cohort.id);

  const base = `/cohorts/${cohort.id}`;
  const when = cohort.status === "active" ? t("cohort.weekOf", { week, total: totalWeeks }) : t(STATUS[cohort.status]);

  const full = (
    <header className="mb-6">
      <Label className="mb-2">{t("cohort.eyebrow", { programme: programme.title, code: cohort.code })}</Label>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{cohort.name}</h1>
      <p className="mt-2 text-sm text-muted">
        {t("cohort.dateRange", { start: formatShortDate(cohort.startsOn), end: formatShortDate(cohort.endsOn) })} ·{" "}
        {when} · {t("cohort.studentCount", { count: students.length })}
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
      <Tabs base={base} items={TABS.map((tab) => ({ href: tab.href, label: t(tab.label) }))} />
      {children}
    </>
  );
}
