import { redirect } from "next/navigation";
import { confirmEmailLink } from "@/lib/auth-actions";
import { supabaseEnabled } from "@/lib/supabase/config";
import { SubmitButton } from "@/components/submit-button";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.continueMetaTitle"), robots: { index: false } };
}

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/**
 * Where links in invite and reset emails land. Nothing happens until the
 * person presses Continue: some mail services open every link to scan it,
 * and doing the one-time sign-in on that visit would burn the link.
 */
export default async function ConfirmEmailLink({ searchParams }: PageProps<"/auth/confirm">) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const tokenHash = str(sp.token_hash);
  const code = str(sp.code);
  if (!supabaseEnabled() || (!tokenHash && !code)) redirect("/login?link=expired");
  const invite = sp.type === "invite";
  return (
    <section className="mx-auto max-w-md px-4 py-16 md:py-24">
      <div className="rounded-md border border-line bg-surface p-6 md:p-8">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">
          {invite ? t("auth.invitedTitle") : t("auth.resetTitle")}
        </h1>
        <p className="mb-6 text-sm text-muted">{invite ? t("auth.invitedLead") : t("auth.resetContinueLead")}</p>
        <form action={confirmEmailLink}>
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={str(sp.type)} />
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="next" value={str(sp.next)} />
          <SubmitButton className="h-11 w-full">{t("auth.continue")}</SubmitButton>
        </form>
      </div>
    </section>
  );
}
