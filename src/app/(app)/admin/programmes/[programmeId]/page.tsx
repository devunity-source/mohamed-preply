import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, FileText, PlayCircle, Trash2, Wrench } from "lucide-react";
import { Card } from "@/components/ui";
import { ActionForm, field } from "@/components/admin-forms";
import { modulesFor, programmeById } from "@/lib/data/repo";
import { deleteLesson, moveLesson, saveLesson, updateModule, updateProgramme } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/authz";
import type { Lesson } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";

const ICON = { reading: FileText, video: PlayCircle, exercise: Wrench };
const iconButton = "rounded-md p-1.5 text-muted hover:bg-line/60 hover:text-ink disabled:opacity-30";

export default async function ProgrammeEditor({ params }: PageProps<"/admin/programmes/[programmeId]">) {
  await requireAdmin();
  const { programmeId } = await params;
  const programme = programmeById(programmeId);
  if (!programme) notFound();
  const modules = modulesFor(programme.id);

  return (
    <>
      <Link
        href="/admin/programmes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> All programmes
      </Link>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{programme.title}</h1>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_2fr] [&>*]:min-w-0">
        <Card title="Programme" className="self-start">
          <ActionForm action={updateProgramme} submitLabel="Save programme">
            <input type="hidden" name="programmeId" value={programme.id} />
            <Text label="Title" name="title" defaultValue={programme.title} required />
            <Text label="Tagline" name="tagline" defaultValue={programme.tagline} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Description</span>
              <textarea name="description" rows={5} defaultValue={programme.description} className={field} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Price (USD)</span>
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
              Published (visible on the landing page waitlist)
            </label>
          </ActionForm>
        </Card>

        <div className="space-y-5">
          {modules.map(({ module, lessons }) => (
            <Card key={module.id} title={`Week ${module.week}`}>
              <details>
                <summary className="cursor-pointer text-xl font-semibold tracking-tight">{module.title}</summary>
                <div className="mt-4">
                  <ActionForm action={updateModule} submitLabel="Save module">
                    <input type="hidden" name="moduleId" value={module.id} />
                    <Text label="Title" name="title" defaultValue={module.title} required />
                    <Text label="Summary" name="summary" defaultValue={module.summary} />
                  </ActionForm>
                </div>
              </details>
              <p className="mt-1 text-sm text-muted">{module.summary}</p>

              <ol className="mt-4 divide-y divide-line border-y border-line">
                {lessons.map((l, i) => {
                  const Icon = ICON[l.kind];
                  return (
                    <li key={l.id} className="py-2">
                      <div className="flex items-center gap-2">
                        <Icon size={15} className="shrink-0 text-muted" />
                        <span className="flex-1 text-sm">{l.title}</span>
                        <span className="font-mono text-xs text-muted">{l.durationMin}m</span>
                        <form action={moveLesson.bind(null, l.id, "up")}>
                          <SubmitButton
                            unstyled
                            className={iconButton}
                            disabled={i === 0}
                            aria-label={`Move ${l.title} up`}
                          >
                            <ArrowUp size={14} />
                          </SubmitButton>
                        </form>
                        <form action={moveLesson.bind(null, l.id, "down")}>
                          <SubmitButton
                            unstyled
                            className={iconButton}
                            disabled={i === lessons.length - 1}
                            aria-label={`Move ${l.title} down`}
                          >
                            <ArrowDown size={14} />
                          </SubmitButton>
                        </form>
                        <ConfirmForm
                          action={deleteLesson.bind(null, l.id)}
                          triggerLabel={`Delete ${l.title}`}
                          triggerClassName={iconButton}
                          trigger={<Trash2 size={14} />}
                          title={`Delete "${l.title}"?`}
                          description="Students lose their progress on this lesson. This can't be undone."
                          confirmLabel="Delete lesson"
                        />
                      </div>
                      <details className="mt-1 ml-6">
                        <summary className="cursor-pointer text-xs text-muted hover:text-ink">Edit</summary>
                        <div className="mt-3">
                          <LessonForm moduleId={module.id} lesson={l} />
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ol>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium hover:text-accent">+ Add lesson</summary>
                <div className="mt-3">
                  <LessonForm moduleId={module.id} />
                </div>
              </details>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

function Text({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input name={name} defaultValue={defaultValue} required={required} className={field} />
    </label>
  );
}

function LessonForm({ moduleId, lesson }: { moduleId: string; lesson?: Lesson }) {
  return (
    <ActionForm action={saveLesson} submitLabel={lesson ? "Save lesson" : "Add lesson"} resetOnSuccess={!lesson}>
      <input type="hidden" name="moduleId" value={moduleId} />
      {lesson && <input type="hidden" name="lessonId" value={lesson.id} />}
      <Text label="Title" name="title" defaultValue={lesson?.title} required />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Type</span>
          <select name="kind" defaultValue={lesson?.kind ?? "reading"} className={field}>
            <option value="reading">Reading</option>
            <option value="video">Video</option>
            <option value="exercise">Exercise</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Minutes</span>
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
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Content</span>
        <textarea name="body" rows={4} defaultValue={lesson?.body} className={field} />
      </label>
    </ActionForm>
  );
}
