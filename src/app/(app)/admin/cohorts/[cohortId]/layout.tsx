import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs } from "@/components/tabs";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { cohortById } from "@/lib/data/admin";
import { isAdmin, managedCohortIds, requireCohortManager } from "@/lib/authz";

export default async function AdminCohortLayout({ children, params }: LayoutProps<"/admin/cohorts/[cohortId]">) {
  const { cohortId } = await params;
  const user = await requireCohortManager(cohortId);
  const cohort = cohortById(cohortId)!;

  const others = managedCohortIds(user).map((id) => ({ id, label: cohortById(id)!.name }));

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
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={14} /> {isAdmin(user) ? "Admin" : "My cohorts"}
        </Link>
        <span className="text-line" aria-hidden>
          /
        </span>
        {others.length > 1 ? (
          <h1 className="min-w-0">
            <CohortSwitcher current={cohort.id} cohorts={others} />
          </h1>
        ) : (
          <h1 className="text-lg font-semibold tracking-tight">{cohort.name}</h1>
        )}
        <span className="text-sm text-muted">
          Cohort {cohort.code} · {cohort.status}
        </span>
      </div>
      <Tabs base={`/admin/cohorts/${cohortId}`} items={items} />
      {children}
    </>
  );
}
