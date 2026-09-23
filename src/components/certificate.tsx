import { Logo } from "@/components/ui";

export function Certificate({
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
  return (
    <div className="relative aspect-[1.414] w-full overflow-hidden rounded-md border border-line bg-surface p-[6%] text-ink">
      <div className="absolute top-0 right-0 h-full w-[18%] bg-ink" aria-hidden />
      <div className="absolute top-0 right-[18%] size-[9%] bg-accent" aria-hidden />
      <div className="relative flex h-full w-[76%] flex-col">
        <div className="flex items-center gap-2">
          <Logo className="size-[clamp(18px,3vw,32px)] text-ink" />
          <span className="text-[clamp(12px,2.2vw,18px)] font-semibold tracking-tight">AcadeMe</span>
        </div>
        <p className="mt-[8%] font-mono text-[clamp(8px,1.3vw,12px)] tracking-[0.2em] text-muted uppercase">
          Certificate of completion
        </p>
        <p className="mt-[3%] text-[clamp(20px,5vw,48px)] leading-none font-semibold tracking-tight">{name}</p>
        <p className="mt-[4%] text-[clamp(11px,1.8vw,18px)]">
          has completed the <span className="font-semibold">{programme}</span> programme
        </p>
        <p className="mt-1 text-[clamp(10px,1.5vw,14px)] text-muted">{period}</p>
        <p className="mt-auto font-mono text-[clamp(8px,1.2vw,11px)] tracking-wider text-muted uppercase">
          Certificate ID · {certificateId}
        </p>
      </div>
    </div>
  );
}
