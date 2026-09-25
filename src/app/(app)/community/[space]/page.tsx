import { notFound } from "next/navigation";
import { Empty, Label } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { NewPostForm } from "@/components/community-forms";
import { canPost, lastSeenIn, postsInSpace, spaceBySlug } from "@/lib/data/repo";
import { MarkSpaceSeen } from "@/components/mark-seen";
import { currentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";

export default async function SpacePage({ params }: PageProps<"/community/[space]">) {
  const { t, locale } = await getI18n();
  const { space: slug } = await params;
  const user = await currentUser();
  const space = spaceBySlug(slug, user.id);
  if (!space) notFound();

  const s = loc(space, locale);
  const posts = postsInSpace(space.id, user.id);
  const now = new Date();
  // Read before MarkSpaceSeen updates it, so this visit still shows what's new.
  const since = lastSeenIn(user.id, space.id, now);

  return (
    <>
      <MarkSpaceSeen slug={space.slug} />
      <header className="mb-6">
        <Label className="mb-2">{s.group}</Label>
        <h1 className="text-3xl font-semibold tracking-tight">{s.name}</h1>
        <p className="mt-1 text-muted">{s.description}</p>
      </header>
      <div className="space-y-3">
        {canPost(user, space) ? (
          <NewPostForm space={space.slug} spaceName={s.name} />
        ) : (
          <p className="text-sm text-muted">{t("community.onlyInstructorsPost")}</p>
        )}
        {posts.length === 0 && <Empty>{t("community.noPosts")}</Empty>}
        {posts.map((v) => (
          <PostCard
            key={v.post.id}
            view={v}
            now={now}
            isNew={v.post.authorId !== user.id && v.post.createdAt > since}
          />
        ))}
      </div>
    </>
  );
}
