import { redirect } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Avatar, Label } from "@/components/ui";
import { SignInForm } from "@/components/sign-in-form";
import { demoSignIn } from "@/lib/auth-actions";
import { demoLoginEnabled, demoPassword } from "@/lib/auth/config";
import { profileById } from "@/lib/data/repo";
import { isInternalPath } from "@/lib/paths";
import { getSessionUser } from "@/lib/session";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Sign in", robots: { index: false } };

const DEMO_ORDER = ["u_ahmed", "u_rakan", "u_samira", "u_yara"];

export default async function Login({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && isInternalPath(sp.next) ? sp.next : undefined;
  if (await getSessionUser()) redirect(next ?? "/dashboard");

  const demo = demoLoginEnabled();
  const demoProfiles = DEMO_ORDER.map(profileById).filter((p) => p !== undefined);

  return (
    <section
      className={clsx(
        "mx-auto grid items-start gap-8 px-4 py-16 md:py-24",
        demo ? "max-w-4xl lg:grid-cols-2" : "max-w-md",
      )}
    >
      <div className="rounded-md border border-line bg-surface p-6 md:p-8">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mb-6 text-sm text-muted">Welcome back. Pick up where you left off.</p>
        <SignInForm next={next} />
        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          Not a student yet?{" "}
          <Link href="/#waitlist" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
            Join the waitlist
          </Link>
        </p>
        {demoPassword() && demo && (
          <p className="mt-4 text-xs text-muted">
            Demo accounts use <span className="font-mono">handle@academe.demo</span> with password{" "}
            <span className="font-mono">{demoPassword()}</span>, e.g. ahmed@academe.demo.
          </p>
        )}
      </div>

      {demo && (
        <div className="rounded-md border border-dashed border-line p-6">
          <Label className="mb-2">Demo mode</Label>
          <p className="mb-5 text-sm text-muted">
            One-click sign-in for local development. Turned off automatically in production unless{" "}
            <span className="font-mono">DEMO_LOGIN=true</span> is set.
          </p>
          <ul className="space-y-2">
            {demoProfiles.map((p) => (
              <li key={p.id}>
                <form action={demoSignIn.bind(null, p.id)}>
                  <SubmitButton
                    unstyled
                    className="flex w-full items-center gap-3 rounded-md border border-line bg-surface p-3 text-left hover:border-ink"
                  >
                    <Avatar profile={p} size={32} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{p.fullName}</span>
                      <span className="block text-xs text-muted">{p.headline}</span>
                    </span>
                    <span className="font-mono text-[11px] tracking-wider text-muted uppercase">{p.role}</span>
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
