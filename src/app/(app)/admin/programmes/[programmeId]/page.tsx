import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Check, FileText, PlayCircle, Trash2, Wrench } from "lucide-react";
import { Card, Pill } from "@/components/ui";
import { db } from "@/lib/data/store";
import { ActionForm, field } from "@/components/admin-forms";
import { rich } from "@/components/rich";
import { modulesFor, programmeById } from "@/lib/data/repo";
import { deleteLesson, moveLesson, saveLesson, updateModule, updateProgramme } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/authz";
import type { Lesson } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import type { T } from "@/lib/i18n/translate";

const ICON = { reading: FileText, video: PlayCircle, exercise: Wrench };
const iconButton = "rounded-md p-1.5 text-muted hover:bg-line/60 hover:text-ink disabled:opacity-30";
const STATUS = {
  upcoming: "admin.statusUpcoming",
  active: "admin.statusActive",
  completed: "admin.statusCompleted",
} as const;

// The inputs show the stored English and Arabic side by side (admins edit
// both); everything else on the page follows the reader's language.
export default async function ProgrammeEditor({ params, searchParams }: PageProps<"/admin/programmes/[programmeId]">) {
  const { t, locale } = await getI18n();
  await requireAdmin();
  const { programmeId } = await params;
  const programme = programmeById(programmeId);
  if (!programme) notFound();
  const modules = modulesFor(programme.id);
  const { created } = await searchParams;
  const cohorts = db()
    .cohorts.filter((c) => c.programmeId === programme.id)
    .sort((a, b) => b.startsOn.getTime() - a.startsOn.getTime());
  const ar = programme.i18n?.ar;

  return (
    <>
      <Link
        href="/admin/programmes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} className="rtl:-scale-x-100" /> {t("curriculum.allProgrammes")}
      </Link>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{loc(programme, locale).title}</h1>
      {created && (
        <p role="status" className="mb-6 flex items-start gap-2 rounded-md border border-ink bg-surface p-4 text-sm">
          <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0" />
          <span>{t("curriculum.createdNote", { count: modules.length })}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_2fr] [&>*]:min-w-0">
        <div className="space-y-5 self-start">
          <Card title={t("curriculum.programmeCard")}>
            <ActionForm action={updateProgramme} submitLabel={t("curriculum.saveProgramme")}>
              <input type="hidden" name="programmeId" value={programme.id} />
              <Text label={t("curriculum.titleLabel")} name="title" defaultValue={programme.title} required />
              <Text label={t("curriculum.taglineLabel")} name="tagline" defaultValue={programme.tagline} />
              <Area
                label={t("curriculum.descriptionLabel")}
                name="description"
                rows={5}
                defaultValue={programme.description}
              />
              <label className="block text-sm">
                <span className="mb-1 block font-medium">{t("curriculum.priceUsd")}</span>
                <input
                  name="price"
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={programme.priceCents / 100}
                  className={field}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={programme.published}
                  className="accent-[var(--accent)]"
                />
                {t("curriculum.publishedLabel")}
              </label>
              <Area
                label={t("curriculum.includesLabel")}
                name="includes"
                rows={5}
                defaultValue={programme.includes.join("\n")}
              />
              <ArabicSection t={t}>
                <Text label={t("curriculum.titleAr")} name="ar:title" defaultValue={ar?.title} arabic />
                <Text label={t("curriculum.taglineAr")} name="ar:tagline" defaultValue={ar?.tagline} arabic />
                <Area
                  label={t("curriculum.descriptionAr")}
                  name="ar:description"
                  rows={5}
                  defaultValue={ar?.description}
                  arabic
                />
                <Area
                  label={t("curriculum.includesAr")}
                  name="ar:includes"
                  rows={5}
                  defaultValue={ar?.includes?.join("\n")}
                  arabic
                />
              </ArabicSection>
              <p className="text-xs text-muted">
                {rich(t("curriculum.certCodeValue", { code: programme.certCode }), {
                  code: (c) => <span dir="ltr">{c}</span>,
                })}
              </p>
            </ActionForm>
          </Card>
          <Card
            title={t("curriculum.cohortsCard", { count: cohorts.length })}
            action={
              <Link href={`/admin/cohorts/new?programme=${programme.id}`} className="text-sm font-medium underline">
                {t("curriculum.newCohort")}
              </Link>
            }
          >
            {cohorts.length ? (
              <ul className="divide-y divide-line">
                {cohorts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/cohorts/${c.id}`}
                      className="flex items-center gap-3 py-2 text-sm hover:text-accent"
                    >
                      <span dir="ltr" className="font-mono text-xs text-muted">
                        {c.code}
                      </span>
                      <span className="flex-1">{c.name}</span>
                      <Pill tone={c.status === "active" ? "good" : "quiet"}>{t(STATUS[c.status])}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("curriculum.noCohorts")}</p>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {modules.map(({ module, lessons }) => {
            const shown = loc(module, locale);
            return (
              <Card key={module.id} title={t("curriculum.weekCard", { week: module.week })}>
                <details>
                  <summary className="cursor-pointer text-xl font-semibold tracking-tight">{shown.title}</summary>
                  <div className="mt-4">
                    <ActionForm action={updateModule} submitLabel={t("curriculum.saveModule")}>
                      <input type="hidden" name="moduleId" value={module.id} />
                      <Text label={t("curriculum.titleLabel")} name="title" defaultValue={module.title} required />
                      <Text label={t("curriculum.summaryLabel")} name="summary" defaultValue={module.summary} />
                      <ArabicSection t={t}>
                        <Text
                          label={t("curriculum.titleAr")}
                          name="ar:title"
                          defaultValue={module.i18n?.ar?.title}
                          arabic
                        />
                        <Text
                          label={t("curriculum.summaryAr")}
                          name="ar:summary"
                          defaultValue={module.i18n?.ar?.summary}
                          arabic
                        />
                      </ArabicSection>
                    </ActionForm>
                  </div>
                </details>
                <p className="mt-1 text-sm text-muted">{shown.summary}</p>

                <ol className="mt-4 divide-y divide-line border-y border-line">
                  {lessons.map((l, i) => {
                    const Icon = ICON[l.kind];
                    const title = loc(l, locale).title;
                    return (
                      <li key={l.id} className="py-2">
                        <div className="flex items-center gap-2">
                          <Icon size={15} className="shrink-0 text-muted" />
                          <span className="flex-1 text-sm">{title}</span>
                          <span className="font-mono text-xs text-muted">
                            {t("curriculum.minutesShort", { count: l.durationMin })}
                          </span>
                          <form action={moveLesson.bind(null, l.id, "up")}>
                            <SubmitButton
                              unstyled
                              className={iconButton}
                              disabled={i === 0}
                              aria-label={t("curriculum.moveUp", { title })}
                            >
                              <ArrowUp size={14} />
                            </SubmitButton>
                          </form>
                          <form action={moveLesson.bind(null, l.id, "down")}>
                            <SubmitButton
                              unstyled
                              className={iconButton}
                              disabled={i === lessons.length - 1}
                              aria-label={t("curriculum.moveDown", { title })}
                            >
                              <ArrowDown size={14} />
                            </SubmitButton>
                          </form>
                          <ConfirmForm
                            action={deleteLesson.bind(null, l.id)}
                            triggerLabel={t("curriculum.deleteLessonLabel", { title })}
                            triggerClassName={iconButton}
                            trigger={<Trash2 size={14} />}
                            title={t("curriculum.deleteLessonTitle", { title })}
                            description={t("curriculum.deleteLessonDescription")}
                            confirmLabel={t("curriculum.deleteLesson")}
                          />
                        </div>
                        <details className="ms-6 mt-1">
                          <summary className="cursor-pointer text-xs text-muted hover:text-ink">
                            {t("curriculum.edit")}
                          </summary>
                          <div className="mt-3">
                            <LessonForm t={t} moduleId={module.id} lesson={l} />
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ol>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium hover:text-accent">
                    {t("curriculum.addLessonToggle")}
                  </summary>
                  <div className="mt-3">
                    <LessonForm t={t} moduleId={module.id} />
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** The Arabic inputs of a form, set off under the English ones. */
function ArabicSection({ t, children }: { t: T; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-s-2 border-line ps-3">
      <legend className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">
        {t("curriculum.arabicVersion")}
      </legend>
      <p className="text-xs text-muted">{t("curriculum.arabicHelp")}</p>
      {children}
    </fieldset>
  );
}

const arabicProps = { lang: "ar", dir: "rtl" } as const;
// The main fields hold the English original: keep them left to right even
// when the page around them is in Arabic.
const englishProps = { lang: "en", dir: "ltr" } as const;

function Text({
  label,
  name,
  defaultValue,
  required,
  arabic,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  arabic?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={field}
        {...(arabic ? arabicProps : englishProps)}
      />
    </label>
  );
}

function Area({
  label,
  name,
  rows,
  defaultValue,
  arabic,
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue?: string;
  arabic?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className={field}
        {...(arabic ? arabicProps : englishProps)}
      />
    </label>
  );
}

function LessonForm({ t, moduleId, lesson }: { t: T; moduleId: string; lesson?: Lesson }) {
  return (
    <ActionForm
      action={saveLesson}
      submitLabel={lesson ? t("curriculum.saveLesson") : t("curriculum.addLesson")}
      resetOnSuccess={!lesson}
    >
      <input type="hidden" name="moduleId" value={moduleId} />
      {lesson && <input type="hidden" name="lessonId" value={lesson.id} />}
      <Text label={t("curriculum.titleLabel")} name="title" defaultValue={lesson?.title} required />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t("curriculum.typeLabel")}</span>
          <select name="kind" defaultValue={lesson?.kind ?? "reading"} className={field}>
            <option value="reading">{t("curriculum.kindReading")}</option>
            <option value="video">{t("curriculum.kindVideo")}</option>
            <option value="exercise">{t("curriculum.kindExercise")}</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t("curriculum.minutesLabel")}</span>
          <input
            name="durationMin"
            type="number"
            min={1}
            max={600}
            required
            defaultValue={lesson?.durationMin ?? 30}
            className={field}
          />
        </label>
      </div>
      <Area label={t("curriculum.contentLabel")} name="body" rows={4} defaultValue={lesson?.body} />
      <ArabicSection t={t}>
        <Text label={t("curriculum.titleAr")} name="ar:title" defaultValue={lesson?.i18n?.ar?.title} arabic />
        <Area label={t("curriculum.contentAr")} name="ar:body" rows={4} defaultValue={lesson?.i18n?.ar?.body} arabic />
      </ArabicSection>
    </ActionForm>
  );
}
