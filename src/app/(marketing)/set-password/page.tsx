import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/components/password-forms";
import { getSessionUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.chooseMetaTitle"), robots: { index: false } };
}

/** Where invite and reset links end up, already signed in by /auth/confirm. */
export default async function SetPassword({ searchParams }: PageProps<"/set-password">) {
  const { t } = await getI18n();
  const user = supabaseEnabled() ? await getSessionUser() : null;
  if (!user) redirect("/login?link=expired");
  const welcome = (await searchParams).welcome === "1";
  return (
    <section className="mx-auto max-w-md px-4 py-16 md:py-24">
      <div className="rounded-md border border-line bg-surface p-6 md:p-8">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">
          {welcome ? t("auth.welcomeName", { name: user.fullName.split(" ")[0] }) : t("auth.chooseNewTitle")}
        </h1>
        <p className="mb-6 text-sm text-muted">{welcome ? t("auth.welcomeLead") : t("auth.chooseNewLead")}</p>
        <SetPasswordForm />
      </div>
    </section>
  );
}
