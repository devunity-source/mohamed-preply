import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { ActionForm, field } from "@/components/admin-forms";
import { createProgramme } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/authz";

export const metadata = { title: "New programme" };

const DEFAULT_INCLUDES = [
  "Live classes",
  "Hands-on labs",
  "Capstone project",
  "Cohort community",
  "Recordings and resources",
];

export default async function NewProgramme() {
  await requireAdmin();
  return (
    <>
      <Link
        href="/admin/programmes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> All programmes
      </Link>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">New programme</h1>
      <p className="mb-6 max-w-2xl text-muted">
        It starts as a draft with one empty module per week. Fill in the weeks and lessons, then tick Published to show
        it on the landing page.
      </p>

      <Card className="max-w-2xl">
        <ActionForm action={createProgramme} submitLabel="Create programme">
          <Field label="Title" name="title" placeholder="Cloud Security Engineer" required />
          <Field label="Tagline" name="tagline" placeholder="One line on who it's for and what they'll be able to do" />
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Description</span>
            <textarea name="description" rows={4} className={field} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Length (weeks)" name="weeks" type="number" min={1} max={52} defaultValue="6" required />
            <Field label="Price (USD)" name="price" type="number" min={0} step={1} placeholder="670" required />
            <Field
              label="Certificate code"
              name="certCode"
              placeholder="SEC"
              pattern="[A-Za-z]{2,5}"
              title="2 to 5 letters"
              required
            />
          </div>
          <p className="text-xs text-muted">
            The certificate code goes in certificate IDs, e.g. ACM-SEC-2026-00001. It can&apos;t be changed later.
          </p>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">What&apos;s included (one per line)</span>
            <textarea name="includes" rows={5} defaultValue={DEFAULT_INCLUDES.join("\n")} className={field} />
          </label>
        </ActionForm>
      </Card>
    </>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input {...props} className={field} />
    </label>
  );
}
