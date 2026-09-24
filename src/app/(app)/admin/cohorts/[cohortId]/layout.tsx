import { unreadInboxCount } from "@/lib/data/office-hours";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs } from "@/components/tabs";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { cohortById } from "@/lib/data/admin";
import { isAdmin, managedCohortIds, requireCohortManager } from "@/lib/authz";
import { getI18n } from "@/lib/i18n/server";
import type { CohortStatus } from "@/lib/types";

const STATUS = {
  upcoming: "teaching.statusUpcoming",
  active: "teaching.statusActive",
  completed: "teaching.statusCompleted",
} as const satisfies Record<CohortStatus, string>;

export default async function AdminCohortLayout({ children, params }: LayoutProps<"/admin/cohorts/[cohortId]">) {
  const { t } = await getI18n();
  const { cohortId } = await params;
  const user = await requireCohortManager(cohortId);
  const cohort = cohortById(cohortId)!;

  const others = managedCohortIds(user).map((id) => ({ id, label: cohortById(id)!.name }));

  const unread = unreadInboxCount(cohortId);
  const items = [
    { href: "", label: t("teaching.tabDashboard") },
    { href: "grading", label: t("teaching.tabGrading") },
    { href: "labs", label: t("teaching.tabLabs") },
    { href: "attendance", label: t("teaching.tabAttendance") },
    { href: "classes", label: t("teaching.tabClasses") },
    { href: "projects", label: t("teaching.tabProjects") },
    {
      href: "office-hours",
      label: unread ? t("teaching.tabOfficeHoursUnread", { count: unread }) : t("teaching.tabOfficeHours"),
    },
    ...(isAdmin(user) ? [{ href: "certificates", label: t("teaching.tabCertificates") }] : []),
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={14} className="rtl:-scale-x-100" />{" "}
          {isAdmin(user) ? t("teaching.backAdmin") : t("teaching.backMyCohorts")}
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
          {t("teaching.cohortMeta", { code: cohort.code, status: t(STATUS[cohort.status]) })}
        </span>
      </div>
      <Tabs base={`/admin/cohorts/${cohortId}`} items={items} />
      {children}
    </>
  );
}
