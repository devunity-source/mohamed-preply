import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with markup in it. The message marks the parts,
 * "Not a student yet? <link>Join the waitlist</link>", and `tags` says what
 * each becomes. Keeps word order in the translation's hands.
 */
export function rich(text: string, tags: Record<string, (chunk: ReactNode) => ReactNode>): ReactNode {
  const parts: ReactNode[] = [];
  const re = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const render = tags[m[1]];
    parts.push(<Fragment key={m.index}>{render ? render(m[2]) : m[2]}</Fragment>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
