import { BookOpen, FlaskConical, MessagesSquare, ShieldCheck, Video } from "lucide-react";
import { dismissWelcome } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

const STUDENT = [
  { icon: BookOpen, text: "dashboard.welcomeStudent1" },
  { icon: FlaskConical, text: "dashboard.welcomeStudent2" },
  { icon: MessagesSquare, text: "dashboard.welcomeStudent3" },
] as const;

const STAFF = [
  { icon: Video, text: "dashboard.welcomeStaff1" },
  { icon: ShieldCheck, text: "dashboard.welcomeStaff2" },
  { icon: MessagesSquare, text: "dashboard.welcomeStaff3" },
] as const;

/** Shown on the dashboard until dismissed. Server-rendered, so it works without JavaScript. */
export async function Welcome({
  firstName,
  staff,
  startHref,
}: {
  firstName: string;
  staff: boolean;
  startHref?: string;
}) {
  const { t } = await getI18n();
  return (
    <section aria-labelledby="welcome-title" className="mb-8 rounded-md border border-ink bg-surface p-6 md:p-8">
      <h2 id="welcome-title" className="text-xl font-semibold tracking-tight">
        {t("dashboard.welcomeTitle", { name: firstName })}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("dashboard.welcomeLead")}</p>
      <ol className="mt-5 grid gap-4 md:grid-cols-3">
        {(staff ? STAFF : STUDENT).map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ink text-paper">
              <Icon size={16} />
            </span>
            <span>{t(text)}</span>
          </li>
        ))}
      </ol>
      <form action={dismissWelcome} className="mt-6 flex flex-wrap gap-3">
        {startHref && (
          <ButtonLink href={startHref}>{staff ? t("dashboard.openAdmin") : t("dashboard.startLessons")}</ButtonLink>
        )}
        <SubmitButton variant="ghost">{t("dashboard.gotIt")}</SubmitButton>
      </form>
    </section>
  );
}
