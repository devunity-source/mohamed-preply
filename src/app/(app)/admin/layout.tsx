import { Label } from "@/components/ui";
import { Tabs } from "@/components/tabs";
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
      <Label className="mb-3">{isAdmin(user) ? "Academy admin" : "Instructor tools"}</Label>
      <Tabs base="/admin" items={items} />
      {children}
    </>
  );
}
