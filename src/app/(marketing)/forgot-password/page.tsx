import Link from "next/link";
import { notFound } from "next/navigation";
import { ForgotPasswordForm } from "@/components/password-forms";
import { supabaseEnabled } from "@/lib/supabase/config";

export const metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPassword() {
  // Resets arrive by email, which only exists with Supabase.
  if (!supabaseEnabled()) notFound();
  return (
    <section className="mx-auto max-w-md px-4 py-16 md:py-24">
      <div className="rounded-md border border-line bg-surface p-6 md:p-8">
        <h1 className="mb-1 text-3xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mb-6 text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
        <ForgotPasswordForm />
        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
