import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { ActionForm, field } from "@/components/admin-forms";
import { rich } from "@/components/rich";
import { createProgramme } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/authz";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("curriculum.metaNewProgramme") };
}

// English content: the Arabic versions are added in the editor afterwards.
const DEFAULT_INCLUDES = [
  "Live classes",
  "Hands-on labs",
  "Capstone project",
  "Cohort community",
  "Recordings and resources",
];

export default async function NewProgramme() {
  const { t } = await getI18n();
  await requireAdmin();
  return (
    <>
      <Link
        href="/admin/programmes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={14} className="rtl:-scale-x-100" /> {t("curriculum.allProgrammes")}
      </Link>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">{t("curriculum.newProgrammeTitle")}</h1>
      <p className="mb-6 max-w-2xl text-muted">{t("curriculum.newProgrammeIntro")}</p>

      <Card className="max-w-2xl">
        <ActionForm action={createProgramme} submitLabel={t("curriculum.createProgramme")}>
          <Field
            label={t("curriculum.titleLabel")}
            name="title"
            placeholder={t("curriculum.titlePlaceholder")}
            required
          />
          <Field label={t("curriculum.taglineLabel")} name="tagline" placeholder={t("curriculum.taglinePlaceholder")} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("curriculum.descriptionLabel")}</span>
            <textarea name="description" rows={4} lang="en" dir="ltr" className={field} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              label={t("curriculum.lengthWeeks")}
              name="weeks"
              type="number"
              min={1}
              max={52}
              defaultValue="6"
              required
            />
            <Field
              label={t("curriculum.priceUsd")}
              name="price"
              type="number"
              min={0}
              step={1}
              placeholder="670"
              required
            />
            <Field
              label={t("curriculum.certCodeLabel")}
              name="certCode"
              placeholder="SEC"
              pattern="[A-Za-z]{2,5}"
              title={t("curriculum.certCodeTitle")}
              dir="ltr"
              required
            />
          </div>
          <p className="text-xs text-muted">
            {rich(t("curriculum.certCodeHelp"), { code: (c) => <span dir="ltr">{c}</span> })}
          </p>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("curriculum.includesLabel")}</span>
            <textarea
              name="includes"
              rows={5}
              lang="en"
              dir="ltr"
              defaultValue={DEFAULT_INCLUDES.join("\n")}
              className={field}
            />
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
      <input lang="en" dir="ltr" {...props} className={field} />
    </label>
  );
}
