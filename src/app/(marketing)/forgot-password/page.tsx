import Link from "next/link";
import { notFound } from "next/navigation";
import { ForgotPasswordForm } from "@/components/password-forms";
import { rich } from "@/components/rich";
import { getI18n } from "@/lib/i18n/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.resetTitle"), robots: { index: false } };
}

export default async function ForgotPassword() {
  const { t } = await getI18n();
  // Resets arrive by email, which only exists with Supabase.
  if (!supabaseEnabled()) notFound();
  return (
    <section className="mx-auto max-w-md px-4 py-16 md:py-24">
      <div className="rounded-md border border-line bg-surface p-6 md:p-8">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
        <p className="mb-6 text-sm text-muted">{t("auth.resetLead")}</p>
        <ForgotPasswordForm />
        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          {rich(t("auth.remembered"), {
            link: (c) => (
              <Link href="/login" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
                {c}
              </Link>
            ),
          })}
        </p>
      </div>
    </section>
  );
}
