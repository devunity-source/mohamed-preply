import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { ButtonLink, Label, PageHeader, Pill } from "@/components/ui";
import { listProgrammes, modulesFor } from "@/lib/data/repo";
import { requireAdmin } from "@/lib/authz";
import { formatMoney } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";

export default async function ProgrammesAdmin() {
  const { t, locale } = await getI18n();
  await requireAdmin();
  return (
    <>
      <PageHeader eyebrow={t("curriculum.eyebrow")} title={t("curriculum.title")}>
        <ButtonLink href="/admin/programmes/new">
          <Plus size={16} /> {t("curriculum.newProgramme")}
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
                  {t("curriculum.weeksPrice", {
                    count: p.durationWeeks,
                    price: formatMoney(p.priceCents, p.currency),
                  })}
                </Label>
                <Pill tone={p.published ? "good" : "quiet"}>
                  {p.published ? t("curriculum.published") : t("curriculum.draft")}
                </Pill>
              </div>
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight group-hover:text-accent">
                {loc(p, locale).title} <ArrowUpRight size={16} className="rtl:-scale-x-100" />
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t("curriculum.modulesCount", { count: modules.length })} ·{" "}
                {t("curriculum.lessonsCount", { count: lessons })}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
