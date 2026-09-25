import Link from "next/link";
import clsx from "clsx";
import { KindMark, Label, Legend } from "@/components/ui";
import { calendarFor, cohortWeek, modulesFor } from "@/lib/data/repo";
import { addDays, daysBetween, formatShortDate, formatTime, formatWeekday } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import { loadCohort } from "../load";

export default async function Schedule({ params }: PageProps<"/cohorts/[cohortId]/schedule">) {
  const { t, locale } = await getI18n();
  const { user, cohort } = await loadCohort(params);
  const now = new Date();
  const { week: currentWeek, totalWeeks } = cohortWeek(cohort, now);
  const items = calendarFor(user.id, cohort.startsOn, addDays(cohort.endsOn, 1, "00:00")).filter(
    (i) => i.cohortId === cohort.id,
  );
  const modules = modulesFor(cohort.programmeId);

  return (
    <>
      <Legend className="mb-6" />
      <div className="space-y-8">
        {Array.from({ length: totalWeeks }, (_, w) => {
          const week = w + 1;
          const weekItems = items.filter((i) => Math.floor(daysBetween(cohort.startsOn, i.startsAt) / 7) === w);
          const found = modules.find((m) => m.module.week === week)?.module;
          const title = found && loc(found, locale).title;
          return (
            <section key={week}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className={clsx("font-mono text-sm font-semibold", week === currentWeek && "text-accent")}>
                  {t("cohort.weekCaps", { week })}
                </h2>
                <p className="font-medium">{title}</p>
                {week === currentWeek && <Label>{t("cohort.current")}</Label>}
              </div>
              <ul className="divide-y divide-line rounded-md border border-line bg-surface">
                {weekItems.map((i) => {
                  const past = i.startsAt < now;
                  const row = (
                    <>
                      <span className="w-28 shrink-0 font-mono text-xs text-muted rtl:w-36">
                        {locale === "ar" ? formatWeekday(i.startsAt) : formatWeekday(i.startsAt).slice(0, 3)}{" "}
                        {formatShortDate(i.startsAt)}
                      </span>
                      <span className="w-12 shrink-0 font-mono text-xs text-muted">{formatTime(i.startsAt)}</span>
                      <KindMark kind={i.kind} />
                      <span className={clsx("flex-1 text-sm", past && "text-muted")}>{i.title}</span>
                    </>
                  );
                  return (
                    <li key={i.id}>
                      {i.href ? (
                        <Link href={i.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper">
                          {row}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2.5">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
