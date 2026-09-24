import { Label } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { HideUnder } from "@/components/path-switch";
import { isAdmin, requireAdminArea } from "@/lib/authz";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdminArea();
  const items = isAdmin(user)
    ? [
        { href: "", label: "Overview" },
        { href: "students", label: "Students" },
        { href: "programmes", label: "Curriculum" },
        { href: "waitlist", label: "Waitlist" },
        { href: "moderation", label: "Moderation" },
      ]
    : [
        { href: "", label: "My cohorts" },
        { href: "moderation", label: "Moderation" },
      ];

  return (
    <>
      {/* Inside a cohort the cohort's own tab bar takes over: one row of tabs, not two. */}
      <HideUnder prefix="/admin/cohorts/">
        <Label className="mb-3">{isAdmin(user) ? "Academy admin" : "Instructor tools"}</Label>
        <Tabs base="/admin" items={items} />
      </HideUnder>
      {children}
    </>
  );
}
