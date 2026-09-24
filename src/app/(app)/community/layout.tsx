import { SpaceNav } from "@/components/space-nav";
import { primaryCohort, unreadBySpace, visibleSpaces } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";

export default async function CommunityLayout({ children }: LayoutProps<"/community">) {
  const user = await currentUser();
  const mine = primaryCohort(user.id)?.cohort.id;
  const unread = unreadBySpace(user.id, new Date());
  const spaces = visibleSpaces(user.id).map((s) => ({
    slug: s.slug,
    name: s.name,
    group: s.group,
    readOnly: s.readOnly,
    cohortOnly: !!s.cohortId,
    unread: unread[s.slug] ?? 0,
    // Always shown: the academy-wide basics and your current cohort. Topic spaces fold under "More".
    pinned: s.cohortId ? s.cohortId === mine : s.group === "General",
  }));

  return (
    <div className="gap-10 lg:flex">
      <aside className="mb-8 lg:mb-0 lg:w-56 lg:shrink-0">
        <details className="rounded-md border border-line bg-surface p-3 lg:hidden">
          <summary className="cursor-pointer text-sm font-medium">Spaces</summary>
          <div className="mt-4">
            <SpaceNav spaces={spaces} />
          </div>
        </details>
        <div className="sticky top-12 hidden lg:block">
          <SpaceNav spaces={spaces} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
