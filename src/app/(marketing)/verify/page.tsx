import { redirect } from "next/navigation";

export const metadata = { title: "Verify a certificate" };

/** /verify?id=ACM-DEV-2026-00001 → /verify/ACM-DEV-2026-00001 */
export default async function VerifyIndex({ searchParams }: PageProps<"/verify">) {
  const { id } = await searchParams;
  const clean =
    typeof id === "string"
      ? id
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9-]/g, "")
      : "";
  if (clean) redirect(`/verify/${clean}`);

  return (
    <section className="mx-auto max-w-xl px-4 py-24 md:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Verify a certificate</h1>
      <p className="mt-2 text-muted">Enter the ID printed at the bottom of an AcadeMe certificate.</p>
      <form action="/verify" className="mt-6 flex gap-2">
        <label htmlFor="verify-id" className="sr-only">
          Certificate ID
        </label>
        <input
          id="verify-id"
          name="id"
          required
          placeholder="ACM-DEV-2026-00001"
          className="h-11 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-sm uppercase outline-none focus:border-ink"
        />
        <button className="rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-accent hover:text-accent-ink">
          Verify
        </button>
      </form>
    </section>
  );
}
