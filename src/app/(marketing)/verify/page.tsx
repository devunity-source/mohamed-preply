import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("verify.metaTitle") };
}

/** /verify?id=ACM-DEV-2026-00001 → /verify/ACM-DEV-2026-00001 */
export default async function VerifyIndex({ searchParams }: PageProps<"/verify">) {
  const { t } = await getI18n();
  const { id } = await searchParams;
  const clean =
    typeof id === "string"
      ? id
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9-]/g, "")
      : "";
  if (clean) redirect(`/verify/${clean}`);

  return (
    <section className="mx-auto max-w-xl px-4 py-24 md:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t("verify.title")}</h1>
      <p className="mt-2 text-muted">{t("verify.lead")}</p>
      <form action="/verify" className="mt-6 flex gap-2">
        <label htmlFor="verify-id" className="sr-only">
          {t("verify.idLabel")}
        </label>
        <input
          id="verify-id"
          name="id"
          required
          dir="ltr"
          placeholder="ACM-DEV-2026-00001"
          className="h-11 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-sm uppercase outline-none focus:border-ink"
        />
        <button className="rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-accent hover:text-accent-ink">
          {t("verify.submit")}
        </button>
      </form>
    </section>
  );
}
