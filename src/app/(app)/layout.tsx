import Link from "next/link";
import { Nav } from "@/components/nav";
import { Avatar, Logo } from "@/components/ui";
import { unreadCount } from "@/lib/data/repo";
import { Bell, LogOut } from "lucide-react";
import { MobileNav } from "@/components/mobile-nav";
import { CommandPalette, SearchButton } from "@/components/command-palette";
import { signOut } from "@/lib/auth-actions";
import { currentUser } from "@/lib/session";
import { hasAdminArea } from "@/lib/authz";
import { ToastProvider } from "@/components/toast";
import { SubmitButton } from "@/components/submit-button";

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
        <SearchButton className="mb-4 flex w-full items-center gap-3 rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-ink hover:text-ink" />
        <Nav unread={unread} showAdmin={showAdmin} />
        <div className="mt-auto flex items-center gap-1">
          <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 hover:bg-line/60">
            <Avatar profile={user} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{user.fullName}</span>
              <span className="block text-xs text-muted capitalize">{user.role}</span>
            </span>
          </Link>
          <form action={signOut}>
            <SubmitButton
              unstyled
              aria-label="Sign out"
              title="Sign out"
              className="rounded-md p-2 text-muted hover:bg-line/60 hover:text-ink"
            >
              <LogOut size={16} />
            </SubmitButton>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur md:hidden print:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="size-6 text-ink" />
            <span className="font-semibold tracking-tight">AcadeMe</span>
          </Link>
          <div className="flex items-center gap-1">
            <SearchButton compact className="rounded-md p-2 text-muted hover:text-ink" />
            <Link
              href="/notifications"
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              className="relative rounded-md p-2 text-muted hover:text-ink"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute top-1 right-0.5 rounded-[4px] bg-accent px-1 font-mono text-[10px] font-semibold text-accent-ink">
                  {unread}
                </span>
              )}
            </Link>
            <Link href="/profile" aria-label="Profile" className="p-1">
              <Avatar profile={user} size={28} />
            </Link>
          </div>
        </div>
      </header>
      <MobileNav unread={unread} showAdmin={showAdmin} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 md:px-10 md:py-12 print:max-w-none print:p-0">
        <ToastProvider>{children}</ToastProvider>
        <CommandPalette />
      </main>
    </div>
  );
}
