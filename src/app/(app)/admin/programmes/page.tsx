import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { ButtonLink, Label, PageHeader, Pill } from "@/components/ui";
import { listProgrammes, modulesFor } from "@/lib/data/repo";
import { requireAdmin } from "@/lib/authz";
import { formatMoney } from "@/lib/format";

export default async function ProgrammesAdmin() {
  await requireAdmin();
  return (
    <>
      <PageHeader eyebrow="Curriculum" title="Programmes">
        <ButtonLink href="/admin/programmes/new">
          <Plus size={16} /> New programme
        </ButtonLink>
      </PageHeader>
      <div className="grid gap-5 md:grid-cols-2">
        {listProgrammes().map((p) => {
          const modules = modulesFor(p.id);
          const lessons = modules.reduce((n, m) => n + m.lessons.length, 0);
          return (
            <Link
              key={p.id}
              href={`/admin/programmes/${p.id}`}
              className="group rounded-md border border-line bg-surface p-6 transition-colors hover:border-ink"
            >
              <div className="mb-3 flex items-center justify-between">
                <Label>
                  {p.durationWeeks} weeks · {formatMoney(p.priceCents, p.currency)}
                </Label>
                <Pill tone={p.published ? "good" : "quiet"}>{p.published ? "Published" : "Draft"}</Pill>
              </div>
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight group-hover:text-accent">
                {p.title} <ArrowUpRight size={16} />
              </h2>
              <p className="mt-1 text-sm text-muted">
                {modules.length} modules · {lessons} lessons
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
