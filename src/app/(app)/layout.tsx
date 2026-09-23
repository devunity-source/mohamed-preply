import Link from "next/link";
import { Nav } from "@/components/nav";
import { Avatar, Logo } from "@/components/ui";
import { unreadCount } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const unread = unreadCount(user.id);

  return (
    <div className="md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line p-4 md:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2 pt-1">
          <Logo className="size-7 text-ink" />
          <span className="text-lg font-semibold tracking-tight">AcadeMe</span>
        </Link>
        <Nav unread={unread} orientation="vertical" />
        <Link href="/profile" className="mt-auto flex items-center gap-3 rounded-md p-2 hover:bg-line/60">
          <Avatar profile={user} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.fullName}</span>
            <span className="block font-mono text-[11px] tracking-wider text-muted uppercase">{user.role} · demo</span>
          </span>
        </Link>
      </aside>

      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="size-6 text-ink" />
            <span className="font-semibold tracking-tight">AcadeMe</span>
          </Link>
          <Avatar profile={user} size={28} />
        </div>
        <Nav unread={unread} orientation="horizontal" />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
