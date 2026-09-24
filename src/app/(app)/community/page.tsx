import { PageHeader } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { feedFor } from "@/lib/data/repo";
import { getI18n } from "@/lib/i18n/server";
import { currentUser } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("common.community") };
}

export default async function Community() {
  const { t } = await getI18n();
  const user = await currentUser();
  const now = new Date();
  return (
    <>
      <PageHeader eyebrow={t("common.community")} title={t("community.latestActivity")} />
      <div className="space-y-3">
        {feedFor(user.id).map((v) => (
          <PostCard key={v.post.id} view={v} now={now} showSpace />
        ))}
      </div>
    </>
  );
}
