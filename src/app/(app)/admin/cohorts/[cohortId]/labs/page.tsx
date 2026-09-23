import clsx from "clsx";
import { Check, Undo2 } from "lucide-react";
import { Avatar, Button, Card, Empty } from "@/components/ui";
import { labBoard } from "@/lib/data/admin";
import { labStatus } from "@/lib/data/repo";
import { reviewLab } from "@/lib/admin-actions";
import { requireCohortManager } from "@/lib/authz";
import type { LabStatus } from "@/lib/types";

const CELL: Record<LabStatus, { label: string; className: string }> = {
  passed: { label: "✓", className: "bg-ink text-paper" },
  submitted: { label: "?", className: "bg-accent text-accent-ink" },
  in_progress: { label: "…", className: "border border-line text-muted" },
  not_started: { label: "", className: "border border-dashed border-line" },
};

export default async function LabReviews({ params }: PageProps<"/admin/cohorts/[cohortId]/labs">) {
  const { cohortId } = await params;
  await requireCohortManager(cohortId);
  const { labs, students, queue } = labBoard(cohortId);

  return (
    <div className="space-y-5">
      <Card title={`Waiting for review · ${queue.length}`}>
        {queue.length === 0 ? (
          <Empty>No labs waiting. Submitted labs show up here.</Empty>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {queue.map(({ lab, profile }) => (
              <li key={`${lab.id}-${profile.id}`} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar profile={profile} size={28} />
                <span className="flex-1">
                  <span className="block font-medium">{profile.fullName}</span>
                  <span className="block text-sm text-muted">
                    Lab #{String(lab.number).padStart(2, "0")}: {lab.title}
                  </span>
                </span>
                <form action={reviewLab.bind(null, lab.id, profile.id, "return")}>
                  <Button variant="ghost">
                    <Undo2 size={14} /> Return
                  </Button>
                </form>
                <form action={reviewLab.bind(null, lab.id, profile.id, "pass")}>
                  <Button>
                    <Check size={14} /> Pass
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="All labs">
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="text-sm">
            <thead>
              <tr className="font-mono text-[11px] text-muted">
                <th className="pr-4 pb-2 text-left font-medium">Student</th>
                {labs.map((l) => (
                  <th key={l.id} className="w-9 pb-2 font-medium" title={l.title}>
                    #{String(l.number).padStart(2, "0")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((p) => (
                <tr key={p.id}>
                  <td className="py-1 pr-4 whitespace-nowrap">{p.fullName}</td>
                  {labs.map((l) => {
                    const st = labStatus(p.id, l.id);
                    return (
                      <td key={l.id} className="p-0.5">
                        <span
                          title={st.replace("_", " ")}
                          className={clsx(
                            "flex size-8 items-center justify-center rounded-[4px] font-mono text-xs",
                            CELL[st].className,
                          )}
                        >
                          {CELL[st].label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted uppercase">
          <span>✓ passed</span>
          <span>? waiting for review</span>
          <span>… in progress</span>
          <span>blank: not started</span>
        </p>
      </Card>
    </div>
  );
}
