import { PageHeader } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { feedFor } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Community" };

export default async function Community() {
  const user = await currentUser();
  const now = new Date();
  return (
    <>
      <PageHeader eyebrow="Community" title="Latest activity" />
      <div className="space-y-3">
        {feedFor(user.id).map((v) => (
          <PostCard key={v.post.id} view={v} now={now} showSpace />
        ))}
      </div>
    </>
  );
}
