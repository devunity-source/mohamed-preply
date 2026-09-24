import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/components/password-forms";
import { getSessionUser } from "@/lib/session";
import { supabaseEnabled } from "@/lib/supabase/config";

export const metadata = { title: "Choose a password", robots: { index: false } };

/** Where invite and reset links end up, already signed in by /auth/confirm. */
export default async function SetPassword({ searchParams }: PageProps<"/set-password">) {
  const user = supabaseEnabled() ? await getSessionUser() : null;
  if (!user) redirect("/login?link=expired");
  const welcome = (await searchParams).welcome === "1";
  return (
    <section className="mx-auto max-w-md px-4 py-16 md:py-24">
      <div className="rounded-md border border-line bg-surface p-6 md:p-8">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">
          {welcome ? `Welcome, ${user.fullName.split(" ")[0]}` : "Choose a new password"}
        </h1>
        <p className="mb-6 text-sm text-muted">
          {welcome
            ? "Choose a password for your AcadeMe account. You'll use it with this email from now on."
            : "Pick something you haven't used here before. Other devices will be signed out."}
        </p>
        <SetPasswordForm />
      </div>
    </section>
  );
}
