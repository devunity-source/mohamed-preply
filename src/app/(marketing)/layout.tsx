import Link from "next/link";
import { Archivo } from "next/font/google";
import { Logo } from "@/components/ui";
import { LanguageToggle } from "@/components/language-toggle";
import { getI18n } from "@/lib/i18n/server";

// Variable width as well as weight: wide headlines, condensed week strip.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

const LINKS = [
  { href: "/#week", label: "nav.aWeek" },
  { href: "/#programmes", label: "nav.programmes" },
  { href: "/#faq", label: "nav.faq" },
] as const;

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const { t } = await getI18n();
  return (
    <div className={`marketing ${archivo.variable} min-h-dvh`}>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-7 text-ink" />
            <span className="font-wide text-lg font-bold tracking-tight">AcadeMe</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-ink">
                {t(l.label)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link href="/login" className="hidden px-3 py-2 text-sm font-medium hover:text-muted sm:block">
              {t("nav.signIn")}
            </Link>
            <Link
              href="/#waitlist"
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-dusk"
            >
              {t("nav.joinWaitlist")}
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-2.5 text-ink">
            <Logo className="size-6" />
            <span className="font-wide font-bold tracking-tight">AcadeMe</span>
          </div>
          <p>{t("nav.footerTagline")}</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-ink">
                {t(l.label)}
              </Link>
            ))}
            <Link href="/login" className="hover:text-ink">
              {t("nav.signIn")}
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} AcadeMe</p>
        </div>
      </footer>
    </div>
  );
}
