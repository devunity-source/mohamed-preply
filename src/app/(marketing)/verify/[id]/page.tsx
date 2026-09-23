import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleX } from "lucide-react";
import { Certificate } from "@/components/certificate";
import { verifyCertificate } from "@/lib/data/admin";
import { formatDate, formatMonthYear } from "@/lib/time";

// Public: anyone with the link can check a certificate. Shows only what's
// printed on the certificate itself (mirrors verify_certificate() in SQL).

const ID = /^AM-[A-Z]{2,5}-\d{4}-\d{5}$/;

export async function generateMetadata({ params }: PageProps<"/verify/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Verify ${id}`, robots: { index: false } };
}

export default async function Verify({ params }: PageProps<"/verify/[id]">) {
  const { id } = await params;
  const result = ID.test(id) ? verifyCertificate(id) : undefined;
  const valid = result && !result.cert.revokedAt;

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 md:px-8">
      <div
        className={`mb-8 flex items-start gap-4 rounded-md border p-5 ${
          valid ? "border-k-office bg-k-office/10" : "border-k-deadline bg-k-deadline/10"
        }`}
      >
        {valid ? (
          <BadgeCheck size={28} className="shrink-0 text-k-office" />
        ) : (
          <CircleX size={28} className="shrink-0 text-k-deadline" />
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {valid ? "Valid certificate" : result ? "This certificate was revoked" : "Certificate not found"}
          </h1>
          <p className="mt-1 text-muted">
            {valid
              ? `Issued by AcadeMe on ${formatDate(result.cert.issuedAt)}.`
              : result
                ? "It is no longer valid. Contact AcadeMe if you have questions."
                : "Check the ID. It looks like AM-DEV-2026-00001."}
          </p>
          <p className="mt-2 font-mono text-xs tracking-wider text-muted uppercase">{id}</p>
        </div>
      </div>

      {valid && (
        <Certificate
          name={result.name}
          programme={result.programme}
          period={`${formatMonthYear(result.cohort.startsOn)} to ${formatMonthYear(result.cohort.endsOn)}`}
          certificateId={result.cert.id}
        />
      )}

      <form action="/verify" className="mt-10 flex max-w-md gap-2">
        <label htmlFor="verify-id" className="sr-only">
          Certificate ID
        </label>
        <input
          id="verify-id"
          name="id"
          placeholder="AM-DEV-2026-00001"
          className="h-11 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-sm uppercase outline-none focus:border-ink"
        />
        <button className="rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-accent hover:text-accent-ink">
          Verify
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        <Link href="/" className="underline hover:text-ink">
          About AcadeMe
        </Link>
      </p>
    </section>
  );
}
