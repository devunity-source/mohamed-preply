import Link from "next/link";
import { rich } from "@/components/rich";
import { SubmitButton } from "@/components/submit-button";
import { unsubscribeFromLink } from "@/lib/actions";
import { validUnsubscribe } from "@/lib/email/links";
import { kindNoun } from "@/lib/email/prefs";
import { getI18n } from "@/lib/i18n/server";
import type { EmailKind } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.unsubMetaTitle"), robots: { index: false } };
}

const settingsLink = (c: React.ReactNode) => (
  <Link href="/profile#email" className="underline underline-offset-4 hover:text-accent">
    {c}
  </Link>
);

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/**
 * Where "Stop these emails" links land. Opening the link changes nothing;
 * the button does. Mail scanners open links, people press buttons.
 */
export default async function Unsubscribe({ searchParams }: PageProps<"/email/unsubscribe">) {
  const { t: tr } = await getI18n();
  const sp = await searchParams;
  const [u, k, t] = [str(sp.u), str(sp.k), str(sp.t)];
  const done = str(sp.done);
  const valid = validUnsubscribe(u, k, t);

  let heading: string;
  let body: React.ReactNode;
  if (["grades", "community", "office_hours", "reminders"].includes(done)) {
    heading = tr("auth.unsubDoneTitle");
    body = rich(tr("auth.unsubDoneBody", { kind: tr(kindNoun(done as EmailKind)) }), {
      strong: (c) => <strong>{c}</strong>,
      link: settingsLink,
    });
  } else if (valid) {
    heading = tr("auth.unsubConfirmTitle", { kind: tr(kindNoun(k)) });
    body = (
      <>
        <p className="mb-6">{tr("auth.unsubConfirmBody")}</p>
        <form action={unsubscribeFromLink}>
          <input type="hidden" name="u" value={u} />
          <input type="hidden" name="k" value={k} />
          <input type="hidden" name="t" value={t} />
          <SubmitButton className="h-11 w-full">{tr("auth.unsubscribe")}</SubmitButton>
        </form>
      </>
    );
  } else {
    heading = tr("auth.unsubInvalidTitle");
    body = rich(tr("auth.unsubInvalidBody"), { link: settingsLink });
  }
  return (
    <section className="mx-auto max-w-md px-4 py-16 md:py-24">
      <div className="rounded-md border border-line bg-surface p-6 md:p-8">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">{heading}</h1>
        <div className="text-sm text-muted">{body}</div>
      </div>
    </section>
  );
}
