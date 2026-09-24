import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { unsubscribeFromLink } from "@/lib/actions";
import { validUnsubscribe } from "@/lib/email/links";
import { kindNoun } from "@/lib/email/prefs";
import type { EmailKind } from "@/lib/types";

export const metadata = { title: "Email settings", robots: { index: false } };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/**
 * Where "Stop these emails" links land. Opening the link changes nothing;
 * the button does. Mail scanners open links, people press buttons.
 */
export default async function Unsubscribe({ searchParams }: PageProps<"/email/unsubscribe">) {
  const sp = await searchParams;
  const [u, k, t] = [str(sp.u), str(sp.k), str(sp.t)];
  const done = str(sp.done);
  const valid = validUnsubscribe(u, k, t);

  let heading: string;
  let body: React.ReactNode;
  if (["grades", "community", "office_hours", "reminders"].includes(done)) {
    heading = "You're unsubscribed";
    body = (
      <>
        No more <strong>{kindNoun(done as EmailKind)}</strong> emails. They still show in your notifications. Change
        your mind any time in{" "}
        <Link href="/profile#email" className="underline underline-offset-4 hover:text-accent">
          your email settings
        </Link>
        .
      </>
    );
  } else if (valid) {
    heading = `Stop ${kindNoun(k)} emails?`;
    body = (
      <>
        <p className="mb-6">You&apos;ll still see them in your notifications on AcadeMe.</p>
        <form action={unsubscribeFromLink}>
          <input type="hidden" name="u" value={u} />
          <input type="hidden" name="k" value={k} />
          <input type="hidden" name="t" value={t} />
          <SubmitButton className="h-11 w-full">Unsubscribe</SubmitButton>
        </form>
      </>
    );
  } else {
    heading = "This link doesn't work";
    body = (
      <>
        It may have been copied incompletely. You can choose which emails you get in{" "}
        <Link href="/profile#email" className="underline underline-offset-4 hover:text-accent">
          your email settings
        </Link>{" "}
        after signing in.
      </>
    );
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
