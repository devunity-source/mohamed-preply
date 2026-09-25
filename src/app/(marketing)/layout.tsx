import Link from "next/link";
import { Logo } from "@/components/ui";
import { LanguageToggle } from "@/components/language-toggle";
import { getI18n } from "@/lib/i18n/server";

const PROGRAMME_LINKS = [
  { href: "/#curriculum", label: "landing.footerCurriculum" },
  { href: "/#week", label: "landing.footerWeek" },
  { href: "/#programmes", label: "landing.footerPricing" },
  { href: "/#faq", label: "nav.faq" },
] as const;

const SUPPORT_LINKS = [
  { href: "/login", label: "nav.signIn" },
  { href: "/verify", label: "landing.footerVerify" },
] as const;

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const { t } = await getI18n();
  return (
    <div className="marketing flex min-h-dvh flex-col">
      <header className="relative z-20">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-20 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Brand />
            <span className="text-lg font-bold">AcadeMe</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/login"
              className="rounded-lg border border-line bg-ink/5 px-4 py-2 text-sm font-medium transition-colors hover:bg-ink/10"
            >
              {t("nav.signIn")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-black/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[2fr_1fr_1fr] md:px-8">
          <div>
            <div className="flex items-center gap-2.5">
              <Brand />
              <span className="font-bold">AcadeMe</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted">{t("nav.footerTagline")}</p>
          </div>
          <FooterColumn
            title={t("landing.footerProgramme")}
            links={PROGRAMME_LINKS.map((l) => ({ ...l, label: t(l.label) }))}
          />
          <FooterColumn
            title={t("landing.footerSupport")}
            links={SUPPORT_LINKS.map((l) => ({ ...l, label: t(l.label) }))}
          />
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-7xl px-4 py-6 text-sm text-muted md:px-8">© {new Date().getFullYear()} AcadeMe</p>
        </div>
      </footer>
    </div>
  );
}

function Brand() {
  return <Logo className="size-8" />;
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className="mb-4 text-xs font-semibold tracking-widest text-cyan uppercase">{title}</p>
      <ul className="space-y-2.5 text-sm text-muted">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="transition-colors hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
