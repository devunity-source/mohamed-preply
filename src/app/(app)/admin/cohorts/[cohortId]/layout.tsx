import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs } from "@/components/tabs";
import { cohortById } from "@/lib/data/admin";
import { programmeById } from "@/lib/data/repo";
import { isAdmin, requireCohortManager } from "@/lib/authz";

export default async function AdminCohortLayout({ children, params }: LayoutProps<"/admin/cohorts/[cohortId]">) {
  const { cohortId } = await params;
  const user = await requireCohortManager(cohortId);
  const cohort = cohortById(cohortId)!;
  const programme = programmeById(cohort.programmeId)!;

  const items = [
    { href: "", label: "Dashboard" },
    { href: "grading", label: "Grading" },
    { href: "labs", label: "Lab reviews" },
    { href: "attendance", label: "Attendance" },
    { href: "classes", label: "Classes" },
    { href: "projects", label: "Projects" },
    ...(isAdmin(user) ? [{ href: "certificates", label: "Certificates" }] : []),
  ];

  return (
    <>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} /> All cohorts
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{cohort.name}</h1>
      <p className="mt-1 mb-6 font-mono text-xs tracking-wider text-muted uppercase">
        {programme.title} · Cohort {cohort.code} · {cohort.status}
      </p>
      <Tabs base={`/admin/cohorts/${cohortId}`} items={items} />
      {children}
    </>
  );
}
