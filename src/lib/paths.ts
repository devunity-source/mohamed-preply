/** In-app paths only: rejects absolute and protocol-relative URLs ("//evil", "/\\evil"). */
export function isInternalPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\");
}
