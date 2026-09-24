import { Download } from "lucide-react";
import { Card, Empty, PageHeader } from "@/components/ui";
import { waitlistRows } from "@/lib/data/admin";
import { listProgrammes } from "@/lib/data/repo";
import { requireAdmin } from "@/lib/authz";
import { formatShortDate, formatTime } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";

export default async function Waitlist() {
  const { t, locale } = await getI18n();
  await requireAdmin();
  const rows = waitlistRows();
  const counts = listProgrammes().map((p) => ({ p, n: rows.filter((r) => r.programmeId === p.id).length }));

  return (
    <>
      <PageHeader eyebrow={t("admin.peopleCount", { count: rows.length })} title={t("admin.waitlistTitle")}>
        {/* Plain <a download>: a route handler, not a page. */}
        <a
          href="/admin/waitlist.csv"
          download
          className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-ink"
        >
          <Download size={14} /> {t("admin.exportCsv")}
        </a>
      </PageHeader>
      <div className="mb-5 grid gap-5 sm:grid-cols-2">
        {counts.map(({ p, n }) => (
          <Card key={p.id} title={loc(p, locale).title}>
            <p className="text-4xl font-semibold tracking-tight">{n}</p>
          </Card>
        ))}
      </div>
      <Card title={t("admin.signUps")}>
        {rows.length === 0 ? (
          <Empty>{t("admin.noSignUps")}</Empty>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 py-2.5 text-sm">
                <span dir="ltr" className="flex-1 text-start font-mono">
                  {r.email}
                </span>
                <span className="text-muted">{loc(r.programme, locale).title}</span>
                <span className="w-32 text-end font-mono text-xs text-muted">
                  {formatShortDate(r.createdAt)} {formatTime(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">{t("admin.demoData")}</p>
      </Card>
    </>
  );
}
