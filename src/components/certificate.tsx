import { Logo } from "@/components/ui";
import { rich } from "@/components/rich";
import { getI18n } from "@/lib/i18n/server";

export async function Certificate({
  name,
  programme,
  period,
  certificateId,
}: {
  name: string;
  programme: string;
  period: string;
  certificateId: string;
}) {
  const { t } = await getI18n();
  return (
    <div className="relative aspect-[1.414] w-full overflow-hidden rounded-2xl border border-line bg-surface p-[6%] text-ink print:rounded-none">
      <div
        className="absolute end-0 top-0 h-full w-[18%] bg-gradient-to-b from-violet to-cyan print:[print-color-adjust:exact]"
        aria-hidden
      />
      <div className="absolute end-[18%] top-0 size-[9%] bg-pink print:[print-color-adjust:exact]" aria-hidden />
      <div className="relative flex h-full w-[76%] flex-col">
        <div className="flex items-center gap-2">
          <Logo className="size-[clamp(18px,3vw,32px)] text-ink" />
          <span className="text-[clamp(12px,2.2vw,18px)] font-semibold tracking-tight">AcadeMe</span>
        </div>
        <p className="mt-[8%] font-mono text-[clamp(8px,1.3vw,12px)] tracking-[0.2em] text-muted uppercase">
          {t("verify.certOfCompletion")}
        </p>
        <p className="mt-[3%] text-[clamp(20px,5vw,48px)] leading-none font-semibold tracking-tight">{name}</p>
        <p className="mt-[4%] text-[clamp(11px,1.8vw,18px)]">
          {rich(t("verify.hasCompleted", { programme }), { b: (c) => <span className="font-semibold">{c}</span> })}
        </p>
        <p className="mt-1 text-[clamp(10px,1.5vw,14px)] text-muted">{period}</p>
        <p className="mt-auto font-mono text-[clamp(8px,1.2vw,11px)] tracking-wider text-muted uppercase">
          {t("verify.idLabel")} · <span dir="ltr">{certificateId}</span>
        </p>
      </div>
    </div>
  );
}
