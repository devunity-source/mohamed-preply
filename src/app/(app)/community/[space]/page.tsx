import { notFound } from "next/navigation";
import { Empty, Label } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { NewPostForm } from "@/components/community-forms";
import { canPost, postsInSpace, spaceBySlug } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";

export default async function SpacePage({ params }: PageProps<"/community/[space]">) {
  const { space: slug } = await params;
  const user = await currentUser();
  const space = spaceBySlug(slug, user.id);
  if (!space) notFound();

  const posts = postsInSpace(space.id, user.id);
  const now = new Date();

  return (
    <>
      <header className="mb-6">
        <Label className="mb-2">{space.group}</Label>
        <h1 className="text-3xl font-semibold tracking-tight">{space.name}</h1>
        <p className="mt-1 text-muted">{space.description}</p>
      </header>
      <div className="space-y-3">
        {canPost(user, space) ? (
          <NewPostForm space={space.slug} spaceName={space.name} />
        ) : (
          <p className="font-mono text-xs tracking-wider text-muted uppercase">Only instructors post here</p>
        )}
        {posts.length === 0 && <Empty>No posts yet. Start the conversation.</Empty>}
        {posts.map((v) => (
          <PostCard key={v.post.id} view={v} now={now} />
        ))}
      </div>
    </>
  );
}
