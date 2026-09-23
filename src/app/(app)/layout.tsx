import Link from "next/link";
import { Nav } from "@/components/nav";
import { Avatar, Logo } from "@/components/ui";
import { unreadCount } from "@/lib/data/repo";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-actions";
import { currentUser } from "@/lib/session";
import { hasAdminArea } from "@/lib/authz";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const unread = unreadCount(user.id);
  const showAdmin = hasAdminArea(user);

  return (
    <div className="md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line p-4 md:flex print:!hidden">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2 pt-1">
          <Logo className="size-7 text-ink" />
          <span className="text-lg font-semibold tracking-tight">AcadeMe</span>
        </Link>
        <Nav unread={unread} orientation="vertical" showAdmin={showAdmin} />
        <div className="mt-auto flex items-center gap-1">
          <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 hover:bg-line/60">
            <Avatar profile={user} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{user.fullName}</span>
              <span className="block font-mono text-[11px] tracking-wider text-muted uppercase">{user.role}</span>
            </span>
          </Link>
          <form action={signOut}>
            <button
              aria-label="Sign out"
              title="Sign out"
              className="rounded-md p-2 text-muted hover:bg-line/60 hover:text-ink"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur md:hidden print:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="size-6 text-ink" />
            <span className="font-semibold tracking-tight">AcadeMe</span>
          </Link>
          <Avatar profile={user} size={28} />
        </div>
        <Nav unread={unread} orientation="horizontal" showAdmin={showAdmin} />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-10 md:py-12 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
