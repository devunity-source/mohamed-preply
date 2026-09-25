import { Label } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { HideUnder } from "@/components/path-switch";
import { isAdmin, requireAdminArea } from "@/lib/authz";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("admin.metaTitle") };
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { t } = await getI18n();
  const user = await requireAdminArea();
  const items = isAdmin(user)
    ? [
        { href: "", label: t("admin.tabOverview") },
        { href: "students", label: t("admin.tabStudents") },
        { href: "programmes", label: t("admin.tabCurriculum") },
        { href: "waitlist", label: t("admin.tabWaitlist") },
        { href: "moderation", label: t("admin.tabModeration") },
      ]
    : [
        { href: "", label: t("admin.tabMyCohorts") },
        { href: "moderation", label: t("admin.tabModeration") },
      ];

  return (
    <>
      {/* Inside a cohort the cohort's own tab bar takes over: one row of tabs, not two. */}
      <HideUnder prefix="/admin/cohorts/">
        <Label className="mb-3">{isAdmin(user) ? t("admin.academyAdmin") : t("admin.instructorTools")}</Label>
        <Tabs base="/admin" items={items} />
      </HideUnder>
      {children}
    </>
  );
}
