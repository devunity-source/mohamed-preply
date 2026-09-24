import Link from "next/link";
import clsx from "clsx";
import { Check, LogOut } from "lucide-react";
import { Avatar, Card, Label, PageHeader, ProgressBar, ProgressBreakdown } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { achievementsFor, listProfiles, myCohorts, primaryCohort, progressFor } from "@/lib/data/repo";
import { certificateFor } from "@/lib/data/admin";
import { demoSignInForm, signOut } from "@/lib/auth-actions";
import { demoLoginEnabled } from "@/lib/auth/config";
import { accountEmail, currentUser, mustChangePassword } from "@/lib/session";
import { ChangePasswordForm } from "@/components/change-password-form";
import { EmailSettingsForm } from "@/components/email-settings-form";
import { EMAIL_KINDS, emailOff } from "@/lib/email/prefs";
import { LanguageToggle } from "@/components/language-toggle";
import { rich } from "@/components/rich";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import type { Key } from "@/lib/i18n/translate";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("profile.metaTitle") };
}

/** Achievement names by id (the data layer's own text is English). */
const ACHIEVEMENTS: Record<string, { label: Key; hint: Key }> = {
  first_lab: { label: "profile.achFirstLab", hint: "profile.achFirstLabHint" },
  voice: { label: "profile.achVoice", hint: "profile.achVoiceHint" },
  foundations: { label: "profile.achFoundations", hint: "profile.achFoundationsHint" },
  azure: { label: "profile.achAzure", hint: "profile.achAzureHint" },
  terraform: { label: "profile.achTerraform", hint: "profile.achTerraformHint" },
  kubernetes: { label: "profile.achKubernetes", hint: "profile.achKubernetesHint" },
  capstone: { label: "profile.achCapstone", hint: "profile.achCapstoneHint" },
};

const mono = (c: React.ReactNode) => (
  <span className="font-mono" dir="ltr">
    {c}
  </span>
);

export default async function Profile() {
  const { t, locale } = await getI18n();
  const user = await currentUser();
  const email = await accountEmail(user.id);
  const primary = primaryCohort(user.id);
  const isStudent = primary?.role === "student";
  const progress = primary && isStudent ? progressFor(user.id, primary.cohort) : null;
  const certificates = myCohorts(user.id).flatMap(({ cohort, programme }) => {
    const cert = certificateFor(user.id, cohort.id);
    return cert && !cert.revokedAt ? [{ cert, programme: loc(programme, locale).title }] : [];
  });
  const achievements = primary && isStudent ? achievementsFor(user.id, primary.cohort) : [];

  return (
    <>
      <PageHeader eyebrow={t("profile.eyebrow")} title={user.fullName} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-5 lg:col-span-2">
          {progress && primary && (
            <Card title={loc(primary.programme, locale).title}>
              <p className="mb-3 text-5xl font-semibold tracking-tight">{progress.percent}%</p>
              <ProgressBar value={progress.percent} />
              <ProgressBreakdown progress={progress} className="mt-3" />
              <ol className="mt-6 grid gap-2 sm:grid-cols-2">
                {progress.modules.map(({ module, status }) => (
                  <li key={module.id} className="flex items-center gap-3 text-sm">
                    <span
                      className={clsx(
                        "flex size-5 shrink-0 items-center justify-center rounded-[4px]",
                        status === "done" && "bg-ink text-paper",
                        status === "in_progress" && "bg-accent",
                        status === "not_started" && "border border-line",
                      )}
                    >
                      {status === "done" && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className={clsx(status === "not_started" && "text-muted")}>{loc(module, locale).title}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {achievements.length > 0 && (
            <Card title={t("profile.achievements")}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {achievements.map((a) => {
                  const names = ACHIEVEMENTS[a.id];
                  return (
                    <li
                      key={a.id}
                      className={clsx(
                        "flex items-center gap-3 rounded-md border p-3",
                        a.earned ? "border-ink" : "border-dashed border-line text-muted",
                      )}
                    >
                      <span
                        className={clsx("size-8 shrink-0 rotate-45 rounded-[4px]", a.earned ? "bg-accent" : "bg-line")}
                        aria-hidden
                      />
                      <span>
                        <span className="block text-sm font-medium">{names ? t(names.label) : a.label}</span>
                        <span className="block text-xs text-muted">{names ? t(names.hint) : a.description}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card title={t("profile.certificates")}>
            {certificates.length ? (
              <ul className="divide-y divide-line">
                {certificates.map(({ cert, programme }) => (
                  <li key={cert.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="flex-1 text-sm font-medium">{programme}</span>
                    <Link
                      href={`/verify/${cert.id}`}
                      className="font-mono text-xs text-muted underline hover:text-ink"
                      dir="ltr"
                    >
                      {cert.id}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("profile.noCertificates")}</p>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-4">
              <Avatar profile={user} size={56} />
              <div>
                <p className="font-semibold">{user.fullName}</p>
                <p className="font-mono text-xs text-muted" dir="ltr">
                  @{user.handle}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm">{user.headline}</p>
          </Card>

          <Card title={t("profile.account")}>
            <p className="text-sm">{rich(t("profile.signedInAs", { email: email ?? "" }), { email: mono })}</p>
            <form action={signOut} className="mt-4">
              <SubmitButton variant="ghost" className="w-full">
                <LogOut size={14} className="rtl:-scale-x-100" /> {t("profile.signOut")}
              </SubmitButton>
            </form>
          </Card>

          <Card title={t("profile.language")}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">{t("profile.languageHint")}</p>
              <LanguageToggle className="shrink-0 border border-line" />
            </div>
          </Card>

          {email && (
            <div id="email" className="scroll-mt-8">
              <Card title={t("profile.email")}>
                <p className="mb-4 text-sm text-muted">{rich(t("profile.emailIntro", { email }), { email: mono })}</p>
                <EmailSettingsForm
                  kinds={EMAIL_KINDS.map((k) => ({ kind: k.kind, label: t(k.label), hint: t(k.hint) }))}
                  off={emailOff(user.id)}
                />
              </Card>
            </div>
          )}

          {email && (
            <div id="password" className="scroll-mt-8">
              <Card title={t("profile.password")}>
                {mustChangePassword(user.id) && (
                  <p className="mb-4 rounded-md border border-k-workshop/40 bg-k-workshop/10 p-3 text-sm">
                    {t("profile.tempPassword")}
                  </p>
                )}
                <ChangePasswordForm />
              </Card>
            </div>
          )}

          {demoLoginEnabled() && (
            <Card title={t("profile.demoMode")}>
              <p className="mb-4 text-sm text-muted">{rich(t("profile.demoIntro"), { code: mono })}</p>
              <form action={demoSignInForm} className="space-y-3">
                <select
                  name="userId"
                  defaultValue={user.id}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
                >
                  {listProfiles().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.role})
                    </option>
                  ))}
                </select>
                <SubmitButton className="w-full">{t("profile.switchAccount")}</SubmitButton>
              </form>
              <Label className="mt-4">{t("profile.demoReset")}</Label>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
