import Link from "next/link";
import { Avatar, Card, PageHeader } from "@/components/ui";
import { allStudents } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/authz";
import { getI18n } from "@/lib/i18n/server";

const STATUS = {
  upcoming: "admin.statusUpcoming",
  active: "admin.statusActive",
  completed: "admin.statusCompleted",
} as const;

export default async function Students() {
  const { t } = await getI18n();
  await requireAdmin();
  const students = allStudents();
  return (
    <>
      <PageHeader eyebrow={t("admin.studentsCount", { count: students.length })} title={t("admin.studentsTitle")} />
      <Card>
        <ul className="-my-2 divide-y divide-line">
          {students.map(({ profile, cohorts, progress }) => (
            <li key={profile.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              <Avatar profile={profile} size={32} />
              <span className="min-w-40 flex-1">
                <span className="block font-medium">{profile.fullName}</span>
                <span className="block text-xs text-muted">{profile.headline}</span>
              </span>
              <span className="flex flex-wrap gap-2">
                {cohorts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/cohorts/${c.id}`}
                    className="rounded-[4px] border border-line px-2 py-0.5 font-mono text-[11px] hover:border-ink"
                  >
                    <span dir="ltr">{c.code}</span> · {t(STATUS[c.status])}
                  </Link>
                ))}
              </span>
              <span className="w-12 text-end font-mono text-sm">
                {progress === null ? t("common.notAvailable") : `${progress}%`}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
