import { redirect } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Avatar, Label } from "@/components/ui";
import { SignInForm } from "@/components/sign-in-form";
import { demoSignIn } from "@/lib/auth-actions";
import { demoLoginEnabled, demoPassword } from "@/lib/auth/config";
import { profileById } from "@/lib/data/repo";
import { isInternalPath } from "@/lib/paths";
import { getSessionUser } from "@/lib/session";
import { supabaseEnabled } from "@/lib/supabase/config";
import { SubmitButton } from "@/components/submit-button";
import { rich } from "@/components/rich";
import { getI18n } from "@/lib/i18n/server";
import type { Role } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.signInTitle"), robots: { index: false } };
}

const ROLE = {
  student: "auth.roleStudent",
  instructor: "auth.roleInstructor",
  admin: "auth.roleAdmin",
} as const satisfies Record<Role, string>;

const DEMO_ORDER = ["u_ahmed", "u_rakan", "u_samira", "u_yara"];

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const next = typeof sp.next === "string" && isInternalPath(sp.next) ? sp.next : undefined;
  if (await getSessionUser()) redirect(next ?? "/dashboard");

  const demo = demoLoginEnabled();
  const demoProfiles = DEMO_ORDER.map(profileById).filter((p) => p !== undefined);

  return (
    <section
      className={clsx(
        "mx-auto grid items-start gap-8 px-4 py-16 md:py-24",
        demo ? "max-w-4xl lg:grid-cols-2" : "max-w-md",
      )}
    >
      <div className="rounded-md border border-line bg-surface p-6 md:p-8">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">{t("auth.signInTitle")}</h1>
        <p className="mb-6 text-sm text-muted">{t("auth.signInLead")}</p>
        {sp.link === "expired" && (
          <p role="alert" className="mb-5 rounded-md border border-k-deadline/40 bg-k-deadline/10 p-3 text-sm">
            {t("auth.linkExpired")}
          </p>
        )}
        <SignInForm next={next} />
        {supabaseEnabled() && (
          <p className="mt-4 text-sm">
            <Link href="/forgot-password" className="text-muted underline underline-offset-4 hover:text-ink">
              {t("auth.forgotPassword")}
            </Link>
          </p>
        )}
        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          {rich(t("auth.notStudent"), {
            link: (c) => (
              <Link href="/#waitlist" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
                {c}
              </Link>
            ),
          })}
        </p>
        {demoPassword() && demo && (
          <p className="mt-4 text-xs text-muted">
            {rich(t("auth.demoAccounts", { password: demoPassword() ?? "" }), {
              mono: (c) => (
                <span className="font-mono" dir="ltr">
                  {c}
                </span>
              ),
              pw: (c) => (
                <span className="font-mono" dir="ltr">
                  {c}
                </span>
              ),
            })}
          </p>
        )}
      </div>

      {demo && (
        <div className="rounded-md border border-dashed border-line p-6">
          <Label className="mb-2">{t("auth.demoMode")}</Label>
          <p className="mb-5 text-sm text-muted">
            {rich(t("auth.demoModeBody"), {
              mono: (c) => (
                <span className="font-mono" dir="ltr">
                  {c}
                </span>
              ),
            })}
          </p>
          <ul className="space-y-2">
            {demoProfiles.map((p) => (
              <li key={p.id}>
                <form action={demoSignIn.bind(null, p.id)}>
                  <SubmitButton
                    unstyled
                    className="flex w-full items-center gap-3 rounded-md border border-line bg-surface p-3 text-start hover:border-ink"
                  >
                    <Avatar profile={p} size={32} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{p.fullName}</span>
                      <span className="block text-xs text-muted">{p.headline}</span>
                    </span>
                    <span className="font-mono text-[11px] tracking-wider text-muted uppercase">{t(ROLE[p.role])}</span>
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
