import Link from "next/link";
import { Logo } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo className="size-10 text-ink" />
      <h1 className="text-3xl font-semibold tracking-tight">{t("nav.notFoundTitle")}</h1>
      <p className="text-muted">{t("nav.notFoundBody")}</p>
      <Link href="/dashboard" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-accent">
        {t("nav.backToDashboard")}
      </Link>
    </div>
  );
}
