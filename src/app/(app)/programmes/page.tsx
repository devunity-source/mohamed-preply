import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { ButtonLink, Card, Label, PageHeader, Pill, ProgressBar } from "@/components/ui";
import { isAdmin } from "@/lib/authz";
import { cohortWeek, publishedProgrammes, myCohorts, progressFor } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";
import { formatShortDate } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import type { CohortStatus } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("programmes.metaTitle") };
}

const STATUS = {
  upcoming: "programmes.statusUpcoming",
  active: "programmes.statusActive",
  completed: "programmes.statusCompleted",
} as const satisfies Record<CohortStatus, string>;

const price = (cents: number, currency: string) => formatMoney(cents, currency);

export default async function Programmes() {
  const { t, locale } = await getI18n();
  const user = await currentUser();
  const now = new Date();
  const mine = myCohorts(user.id);
  const enrolledProgrammes = new Set(mine.map((m) => m.programme.id));
  const catalogue = publishedProgrammes()
    .filter((p) => !enrolledProgrammes.has(p.id))
    .map((p) => loc(p, locale));

  return (
    <>
      <PageHeader eyebrow={t("programmes.eyebrow")} title={t("programmes.title")}>
        {isAdmin(user) && (
          <ButtonLink href="/admin/programmes/new">
            <Plus size={16} /> {t("programmes.newProgramme")}
          </ButtonLink>
        )}
      </PageHeader>

      <div className="grid gap-5 md:grid-cols-2">
        {mine.map(({ cohort, programme, role }) => {
          const { week, totalWeeks } = cohortWeek(cohort, now);
          const progress = role === "student" ? progressFor(user.id, cohort) : null;
          return (
            <Link
              key={cohort.id}
              href={`/cohorts/${cohort.id}`}
              className="group rounded-md border border-line bg-surface p-6 transition-colors hover:border-ink"
            >
              <div className="mb-6 flex items-center justify-between">
                <Label>{t("programmes.cohortCode", { code: cohort.code })}</Label>
                <Pill tone={cohort.status === "active" ? "good" : "quiet"}>
                  {cohort.status === "active"
                    ? t("programmes.weekPill", { week, total: totalWeeks })
                    : t(STATUS[cohort.status])}
                </Pill>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight group-hover:text-accent">
                {loc(programme, locale).title}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t("programmes.dateRange", {
                  start: formatShortDate(cohort.startsOn),
                  end: formatShortDate(cohort.endsOn),
                })}
                {role === "instructor" && t("programmes.asInstructor")}
              </p>
              {progress && (
                <div className="mt-6">
                  <p className="mb-2 font-mono text-sm">{progress.percent}%</p>
                  <ProgressBar value={progress.percent} />
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {catalogue.length > 0 && (
        <>
          <h2 className="mt-14 mb-4 text-xl font-semibold tracking-tight">{t("programmes.explore")}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {catalogue.map((p) => (
              <Card key={p.id}>
                <Label>{t("programmes.weeksLive", { count: p.durationWeeks })}</Label>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-1 text-muted">{p.tagline}</p>
                <ul className="mt-5 space-y-1.5 text-sm">
                  {p.includes.map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check size={14} className="text-muted" strokeWidth={3} /> {i}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
                  <span className="text-3xl font-semibold tracking-tight">{price(p.priceCents, p.currency)}</span>
                  <span
                    className="cursor-not-allowed rounded-md bg-ink/40 px-4 py-2 text-sm font-medium text-paper"
                    title={t("programmes.checkoutSoon")}
                  >
                    {t("programmes.enrol")}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
