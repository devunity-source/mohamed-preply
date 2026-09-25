import { FileText, FlaskConical, LayoutTemplate, Presentation, Video } from "lucide-react";
import type { Resource } from "@/lib/types";

const ICONS = {
  slides: Presentation,
  recording: Video,
  cheatsheet: FileText,
  template: LayoutTemplate,
  lab: FlaskConical,
};

export function ResourceList({ resources }: { resources: Resource[] }) {
  return (
    <ul className="space-y-1">
      {resources.map((r) => {
        const Icon = ICONS[r.kind];
        return (
          <li key={r.id}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-paper hover:text-accent"
            >
              <Icon size={15} className="shrink-0 text-muted" />
              <span className="truncate">{r.title}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
