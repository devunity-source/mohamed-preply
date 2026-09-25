import { profileByHandle } from "@/lib/data/repo";

/** Plain text with paragraphs and highlighted @mentions. No HTML is interpreted. */
export function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para.split(/(@[a-z0-9_]+)/gi).map((part, j) =>
            part.startsWith("@") && profileByHandle(part.slice(1).toLowerCase()) ? (
              <span key={j} className="rounded-[3px] bg-accent/15 px-1 font-medium text-accent">
                {part}
              </span>
            ) : (
              part
            ),
          )}
        </p>
      ))}
    </div>
  );
}
