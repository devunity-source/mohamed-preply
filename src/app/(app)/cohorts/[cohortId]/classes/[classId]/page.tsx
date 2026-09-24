import { notFound } from "next/navigation";
import { Video } from "lucide-react";
import { Avatar, ButtonLink, Card, Empty, Pill } from "@/components/ui";
import { ResourceList } from "@/components/resource-list";
import { attendanceCount, classById, classResources, cohortRoster, isLive, profileById } from "@/lib/data/repo";
import { formatFull, formatTime, relativeDay } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loadCohort } from "../../load";

const PROVIDER = { zoom: "Zoom", google_meet: "Google Meet", livekit: "LiveKit" };

export default async function Classroom({ params }: PageProps<"/cohorts/[cohortId]/classes/[classId]">) {
  const { t } = await getI18n();
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
  const participants = ended ? attendanceCount(c.id) : students.length;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
      <section className="rounded-md bg-ink p-6 text-paper md:p-10 lg:col-span-2">
        <div className="flex items-center gap-3">
          <p className="text-[13px] font-medium opacity-60">{t("classes.liveClassroom")}</p>
          {live && <Pill tone="accent">{t("classes.live")}</Pill>}
        </div>
        <h2 className="mt-8 text-3xl font-semibold tracking-tight md:text-4xl">{c.title}</h2>
        <p className="mt-3 max-w-xl opacity-70">{c.description}</p>
        <dl className="mt-8 grid grid-cols-2 gap-6 font-mono text-sm sm:grid-cols-3">
          <div>
            <dt className="font-sans text-xs opacity-60">{t("classes.when")}</dt>
            <dd className="mt-1">
              {relativeDay(c.startsAt, now)} · {formatTime(c.startsAt)}
            </dd>
          </div>
          <div>
            <dt className="font-sans text-xs opacity-60">{t("classes.duration")}</dt>
            <dd className="mt-1">{t("classes.minutes", { count: c.durationMin })}</dd>
          </div>
          <div>
            <dt className="font-sans text-xs opacity-60">{t("classes.via")}</dt>
            <dd className="mt-1">{PROVIDER[c.provider]}</dd>
          </div>
        </dl>
        <div className="mt-10">
          {ended ? (
            c.recordingUrl ? (
              <ButtonLink href={c.recordingUrl} external variant="accent">
                <Video size={16} /> {t("classes.watchRecording")}
              </ButtonLink>
            ) : (
              <p className="opacity-70">{t("classes.processing")}</p>
            )
          ) : live ? (
            <ButtonLink href={c.meetingUrl} external variant="accent">
              <Video size={16} /> {t("classes.join")}
            </ButtonLink>
          ) : (
            <div>
              <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-paper/15 px-4 py-2 text-sm font-medium">
                <Video size={16} /> {t("classes.join")}
              </span>
              <p className="mt-2 font-mono text-xs opacity-60">
                {t("classes.opensBefore", { when: formatFull(c.startsAt) })}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="space-y-5">
        <Card title={t("classes.instructor")}>
          <div className="flex items-center gap-3">
            <Avatar profile={instructor} size={40} />
            <div>
              <p className="font-medium">{instructor.fullName}</p>
              <p className="text-sm text-muted">{instructor.headline}</p>
            </div>
          </div>
        </Card>
        <Card title={t("classes.participants")}>
          <p className="text-3xl font-semibold tracking-tight">
            {participants}
            <span className="ms-2 text-sm font-normal text-muted">
              {t(ended ? "classes.attended" : "classes.invited", { count: participants })}
            </span>
          </p>
        </Card>
        <Card title={t("classes.resources")}>
          {resources.length ? <ResourceList resources={resources} /> : <Empty>{t("classes.noResources")}</Empty>}
        </Card>
      </div>
    </div>
  );
}
