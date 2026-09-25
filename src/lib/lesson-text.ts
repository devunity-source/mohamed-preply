/** First real paragraph of a lesson, as plain text, for previews. */
export function lessonExcerpt(body: string, max = 180): string {
  const para =
    body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith("```") && !p.startsWith("## ") && !p.startsWith("- ")) ?? "";
  const plain = para
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ");
  return plain.length > max ? `${plain.slice(0, max).replace(/\s+\S*$/, "")}…` : plain;
}
