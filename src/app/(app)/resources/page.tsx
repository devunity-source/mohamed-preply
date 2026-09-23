import { Card, Empty, PageHeader } from "@/components/ui";
import { ResourceList } from "@/components/resource-list";
import { resourcesFor } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";
import type { Resource } from "@/lib/types";

export const metadata = { title: "Resources" };

const SECTIONS: { kind: Resource["kind"]; title: string }[] = [
  { kind: "slides", title: "Slides" },
  { kind: "recording", title: "Recordings" },
  { kind: "cheatsheet", title: "Cheat sheets" },
  { kind: "template", title: "Templates" },
  { kind: "lab", title: "Labs" },
];

export default async function Resources() {
  const user = await currentUser();
  const all = resourcesFor(user.id);
  return (
    <>
      <PageHeader eyebrow="Library" title="Resources" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map(({ kind, title }) => {
          const list = all.filter((r) => r.kind === kind);
          return (
            <Card key={kind} title={`${title} · ${list.length}`}>
              {list.length ? <ResourceList resources={list} /> : <Empty>Nothing here yet.</Empty>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
