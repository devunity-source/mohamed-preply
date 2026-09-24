import { Fragment } from "react";

// Renders the small Markdown subset used for lessons into React elements.
// No HTML is ever interpreted, so lesson text can't inject markup.

type Block =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "code"; text: string };

/** Index of the fence that closes a code block opened before `from`, or the end. */
function closingFence(lines: string[], from: number): number {
  const end = lines.findIndex((l, j) => j >= from && l.startsWith("```"));
  return end === -1 ? lines.length : end;
}

/** Ends the open paragraph or list, if any. */
function flushInto(blocks: Block[], para: string[], list: string[]) {
  if (para.length) blocks.push({ type: "p", text: para.join(" ") });
  if (list.length) blocks.push({ type: "ul", items: [...list] });
  para.length = 0;
  list.length = 0;
}

function parse(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const para: string[] = [];
  const list: string[] = [];
  const flush = () => flushInto(blocks, para, list);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i++];
    if (line.startsWith("```")) {
      flush();
      const end = closingFence(lines, i);
      blocks.push({ type: "code", text: lines.slice(i, end).join("\n") });
      i = end + 1;
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h", text: line.slice(3) });
    } else if (line.startsWith("- ")) {
      if (para.length) flush();
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flush();
    } else {
      if (list.length) flush();
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

/** `code` and **bold** inside a line. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded-[4px] bg-line/70 px-1.5 py-0.5 font-mono text-[0.85em]">
            {part.slice(1, -1)}
          </code>
        ) : part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function LessonBody({ source }: { source: string }) {
  return (
    <div className="space-y-5 text-[1.05rem] leading-relaxed">
      {parse(source).map((b, i) => {
        if (b.type === "h")
          return (
            <h2 key={i} className="pt-4 text-xl font-semibold tracking-tight">
              {b.text}
            </h2>
          );
        if (b.type === "code")
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-md bg-ink p-4 font-mono text-[13px] leading-relaxed text-paper"
            >
              <code>{b.text}</code>
            </pre>
          );
        if (b.type === "ul")
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-[1px] bg-accent" aria-hidden />
                  <span>
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i}>
            <Inline text={b.text} />
          </p>
        );
      })}
    </div>
  );
}
