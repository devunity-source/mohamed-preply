import { Card, Empty, PageHeader } from "@/components/ui";
import { ResourceList } from "@/components/resource-list";
import { resourcesFor } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";
import type { Resource } from "@/lib/types";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("resources.metaTitle") };
}

const SECTIONS = [
  { kind: "slides", title: "resources.slides" },
  { kind: "recording", title: "resources.recordings" },
  { kind: "cheatsheet", title: "resources.cheatsheets" },
  { kind: "template", title: "resources.templates" },
  { kind: "lab", title: "resources.labs" },
] as const satisfies readonly { kind: Resource["kind"]; title: string }[];

export default async function Resources() {
  const { t } = await getI18n();
  const user = await currentUser();
  const all = resourcesFor(user.id);
  return (
    <>
      <PageHeader eyebrow={t("resources.eyebrow")} title={t("resources.title")} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        {SECTIONS.map(({ kind, title }) => {
          const list = all.filter((r) => r.kind === kind);
          return (
            <Card key={kind} title={t("resources.sectionCount", { title: t(title), count: list.length })}>
              {list.length ? <ResourceList resources={list} /> : <Empty>{t("resources.empty")}</Empty>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
