import Link from "next/link";
import { Avatar, Card, PageHeader } from "@/components/ui";
import { allStudents } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/authz";

export default async function Students() {
  await requireAdmin();
  const students = allStudents();
  return (
    <>
      <PageHeader eyebrow={`${students.length} students`} title="Students" />
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
                    {c.code} · {c.status}
                  </Link>
                ))}
              </span>
              <span className="w-12 text-right font-mono text-sm">{progress === null ? "n/a" : `${progress}%`}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
