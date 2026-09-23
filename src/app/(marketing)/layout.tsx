import Link from "next/link";
import { Logo } from "@/components/ui";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#programmes", label: "Programmes" },
  { href: "/#faq", label: "FAQ" },
];

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-7 text-ink" />
            <span className="text-lg font-semibold tracking-tight">AcadeMe</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-3 py-2 text-sm font-medium hover:text-accent sm:block">
              Sign in
            </Link>
            <Link
              href="/#waitlist"
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent hover:text-accent-ink"
            >
              Join waitlist
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-2.5 text-ink">
            <Logo className="size-6" />
            <span className="font-semibold tracking-tight">AcadeMe</span>
            <span className="text-muted">· Live cohorts for people switching into tech</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-ink">
                {l.label}
              </Link>
            ))}
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} AcadeMe</p>
        </div>
      </footer>
    </>
  );
}
