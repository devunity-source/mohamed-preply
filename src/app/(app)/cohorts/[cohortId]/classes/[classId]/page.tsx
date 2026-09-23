import { notFound } from "next/navigation";
import { Video } from "lucide-react";
import { Avatar, ButtonLink, Card, Empty, Pill } from "@/components/ui";
import { ResourceList } from "@/components/resource-list";
import { attendanceCount, classById, classResources, cohortRoster, isLive, profileById } from "@/lib/data/repo";
import { formatFull, formatTime, relativeDay } from "@/lib/time";
import { loadCohort } from "../../load";

const PROVIDER = { zoom: "Zoom", google_meet: "Google Meet", livekit: "LiveKit" };

export default async function Classroom({ params }: PageProps<"/cohorts/[cohortId]/classes/[classId]">) {
  const { classId } = await params;
  const { cohort } = await loadCohort(params);
  const c = classById(classId);
  if (!c || c.cohortId !== cohort.id) notFound();

  const now = new Date();
  const live = isLive(c, now);
  const ended = c.startsAt.getTime() + c.durationMin * 60_000 < now.getTime();
  const instructor = profileById(c.instructorId)!;
  const { students } = cohortRoster(cohort.id);
  const resources = classResources(c);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="rounded-md bg-ink p-6 text-paper md:p-10 lg:col-span-2">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase opacity-60">Live classroom</p>
          {live && <Pill tone="accent">Live</Pill>}
        </div>
        <h2 className="mt-8 text-3xl font-semibold tracking-tight md:text-4xl">{c.title}</h2>
        <p className="mt-3 max-w-xl opacity-70">{c.description}</p>
        <dl className="mt-8 grid grid-cols-2 gap-6 font-mono text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[11px] tracking-wider uppercase opacity-60">When</dt>
            <dd className="mt-1">
              {relativeDay(c.startsAt, now)} · {formatTime(c.startsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-wider uppercase opacity-60">Duration</dt>
            <dd className="mt-1">{c.durationMin} min</dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-wider uppercase opacity-60">Via</dt>
            <dd className="mt-1">{PROVIDER[c.provider]}</dd>
          </div>
        </dl>
        <div className="mt-10">
          {ended ? (
            c.recordingUrl ? (
              <ButtonLink href={c.recordingUrl} external variant="accent">
                <Video size={16} /> Watch recording
              </ButtonLink>
            ) : (
              <p className="opacity-70">Recording is being processed.</p>
            )
          ) : live ? (
            <ButtonLink href={c.meetingUrl} external variant="accent">
              <Video size={16} /> Join class
            </ButtonLink>
          ) : (
            <div>
              <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-paper/15 px-4 py-2 text-sm font-medium">
                <Video size={16} /> Join class
              </span>
              <p className="mt-2 font-mono text-xs opacity-60">
                Opens 10 minutes before start · {formatFull(c.startsAt)}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="space-y-5">
        <Card title="Instructor">
          <div className="flex items-center gap-3">
            <Avatar profile={instructor} size={40} />
            <div>
              <p className="font-medium">{instructor.fullName}</p>
              <p className="text-sm text-muted">{instructor.headline}</p>
            </div>
          </div>
        </Card>
        <Card title="Participants">
          <p className="text-3xl font-semibold tracking-tight">
            {ended ? attendanceCount(c.id) : students.length}
            <span className="ml-2 text-sm font-normal text-muted">{ended ? "attended" : "students invited"}</span>
          </p>
        </Card>
        <Card title="Resources">
          {resources.length ? <ResourceList resources={resources} /> : <Empty>No resources yet.</Empty>}
        </Card>
      </div>
    </div>
  );
}
