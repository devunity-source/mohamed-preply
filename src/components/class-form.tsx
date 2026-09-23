import { ActionForm, field } from "@/components/admin-forms";
import { saveClass } from "@/lib/admin-actions";
import { zonedParts } from "@/lib/time";
import type { ClassSession, Module } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

function toInputs(date: Date) {
  const p = zonedParts(date);
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

export function ClassForm({
  cohortId,
  modules,
  existing,
  defaultStart,
  autoMeetings,
}: {
  cohortId: string;
  modules: Module[];
  existing?: ClassSession;
  defaultStart: Date;
  autoMeetings: boolean;
}) {
  const when = toInputs(existing?.startsAt ?? defaultStart);
  return (
    <ActionForm action={saveClass} submitLabel={existing ? "Save changes" : "Schedule class"}>
      <input type="hidden" name="cohortId" value={cohortId} />
      {existing && <input type="hidden" name="classId" value={existing.id} />}
      <Field label="Title">
        <input name="title" required maxLength={140} defaultValue={existing?.title} className={field} />
      </Field>
      <Field label="Description">
        <textarea name="description" rows={2} maxLength={1000} defaultValue={existing?.description} className={field} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Module">
          <select name="moduleId" defaultValue={existing?.moduleId} className={field}>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                Week {m.week}: {m.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Video">
          <select name="provider" defaultValue={existing?.provider ?? "zoom"} className={field}>
            <option value="zoom">Zoom</option>
            <option value="google_meet">Google Meet</option>
            <option value="livekit">LiveKit</option>
          </select>
        </Field>
        <Field label="Date">
          <input name="date" type="date" required defaultValue={when.date} className={field} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <input name="time" type="time" required defaultValue={when.time} className={field} />
          </Field>
          <Field label="Minutes">
            <input
              name="durationMin"
              type="number"
              min={15}
              max={300}
              step={5}
              required
              defaultValue={existing?.durationMin ?? 90}
              className={field}
            />
          </Field>
        </div>
      </div>
      <Field
        label="Meeting link"
        hint={
          autoMeetings
            ? "Leave empty to create a Zoom meeting automatically."
            : "Paste the Zoom, Meet or LiveKit link. Automatic Zoom meetings turn on once Zoom API keys are configured."
        }
      >
        <input
          name="meetingUrl"
          type="url"
          required={!autoMeetings}
          placeholder="https://zoom.us/j/…"
          defaultValue={existing?.meetingUrl}
          className={field}
        />
      </Field>
      <Field label="Recording link" hint="Add after the class. Students see it on the classroom page.">
        <input
          name="recordingUrl"
          type="url"
          placeholder="https://…"
          defaultValue={existing?.recordingUrl ?? ""}
          className={field}
        />
      </Field>
    </ActionForm>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
