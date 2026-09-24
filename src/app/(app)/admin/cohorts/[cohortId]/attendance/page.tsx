import Link from "next/link";
import clsx from "clsx";
import { Avatar, Card, Empty } from "@/components/ui";
import { ActionForm } from "@/components/admin-forms";
import { MarkRemaining } from "@/components/mark-remaining";
import { attendanceFor } from "@/lib/data/admin";
import { cohortClasses, cohortRoster } from "@/lib/data/repo";
import { saveAttendance } from "@/lib/admin-actions";
import { requireCohortManager } from "@/lib/authz";
import { formatShortDate, formatTime } from "@/lib/time";
import type { Attendance } from "@/lib/types";

const OPTIONS: { value: Attendance["status"]; label: string; on: string }[] = [
  { value: "present", label: "Present", on: "peer-checked:bg-ink peer-checked:text-paper" },
  { value: "late", label: "Late", on: "peer-checked:bg-k-workshop peer-checked:text-white" },
  { value: "absent", label: "Absent", on: "peer-checked:bg-k-deadline peer-checked:text-white" },
];
const SHORT = { present: "P", late: "L", absent: "A" } as const;

export default async function AttendancePage({
  params,
  searchParams,
}: PageProps<"/admin/cohorts/[cohortId]/attendance">) {
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  const sp = await searchParams;
  const now = new Date();
  // Classes that have started (the room opens 10 minutes early).
  const past = cohortClasses(cohortId).filter((c) => c.startsAt.getTime() - 10 * 60_000 <= now.getTime());
  const students = cohortRoster(cohortId).students;

  if (past.length === 0) return <Empty>No classes have happened yet.</Empty>;

  const selected = past.find((c) => c.id === sp.class) ?? past[past.length - 1];
  const marks = new Map(attendanceFor(selected.id).map((a) => [a.userId, a.status]));
  const unmarked = students.filter((p) => !marks.has(p.id)).length;
  const byClass = new Map(past.map((c) => [c.id, new Map(attendanceFor(c.id).map((a) => [a.userId, a.status]))]));

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
      <Card title="Take attendance">
        <nav aria-label="Class" className="mb-4 flex flex-wrap gap-2">
          {past.slice(-6).map((c) => (
            <Link
              key={c.id}
              href={`?class=${c.id}`}
              scroll={false}
              className={clsx(
                "rounded-md border px-3 py-1.5 text-xs",
                c.id === selected.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
              )}
            >
              {formatShortDate(c.startsAt)}
            </Link>
          ))}
        </nav>
        <p className="mb-4 font-medium">
          {selected.title}{" "}
          <span className="font-mono text-xs text-muted">
            {formatShortDate(selected.startsAt)} {formatTime(selected.startsAt)}
          </span>
        </p>
        {/* key: remount with fresh defaults when switching class */}
        <ActionForm key={selected.id} action={saveAttendance} submitLabel="Save attendance">
          <input type="hidden" name="classId" value={selected.id} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {unmarked === 0 ? "Everyone is marked." : `${unmarked} of ${students.length} not marked yet.`}
            </p>
            <MarkRemaining value="present" label="Mark remaining present" />
          </div>
          <ul className="divide-y divide-line">
            {students.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                <Avatar profile={p} size={24} />
                <span className="min-w-32 flex-1 text-sm">{p.fullName}</span>
                <span className="flex gap-1">
                  {OPTIONS.map((o) => (
                    <label key={o.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`att:${p.id}`}
                        value={o.value}
                        defaultChecked={marks.get(p.id) === o.value}
                        className="peer sr-only"
                      />
                      <span
                        className={clsx(
                          "block rounded-md border border-line px-2.5 py-1 text-xs peer-focus-visible:outline-2 peer-focus-visible:outline-accent",
                          o.on,
                        )}
                      >
                        {o.label}
                      </span>
                    </label>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </ActionForm>
      </Card>

      <Card title="History">
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="text-sm">
            <thead>
              <tr className="font-mono text-[11px] text-muted">
                <th className="pr-4 pb-2 text-left font-medium">Student</th>
                {past.map((c) => (
                  <th key={c.id} className="w-8 pb-2 font-medium" title={c.title}>
                    {formatShortDate(c.startsAt).split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((p) => (
                <tr key={p.id}>
                  <td className="py-1 pr-4 whitespace-nowrap">{p.fullName}</td>
                  {past.map((c) => {
                    const st = byClass.get(c.id)?.get(p.id);
                    return (
                      <td key={c.id} className="p-0.5">
                        <span
                          className={clsx(
                            "flex size-7 items-center justify-center rounded-[4px] font-mono text-[11px]",
                            st === "present" && "bg-ink text-paper",
                            st === "late" && "bg-k-workshop text-white",
                            st === "absent" && "bg-k-deadline text-white",
                            !st && "border border-dashed border-line",
                          )}
                        >
                          {st ? SHORT[st] : ""}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
