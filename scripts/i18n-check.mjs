// Fails if a page or component shows English written straight into the
// markup instead of coming from the message files (docs/i18n.md).
// Run with: npm run i18n:check
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOTS = ["src/app", "src/components"];
// Attributes people read (screen readers included).
const READ_ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label"]);
// Allowed as-is: the brand, product names, key names and symbols.
const ALLOWED = new Set(["AcadeMe", "⌘K", "Esc", "esc", "j", "k", "or", "·", "Zoom", "Google Meet", "LiveKit", "SEC"]);
// URLs, paths, email addresses and certificate IDs read the same in both languages.
const TECHNICAL = /^(https?:\/\/\S*|\/[\w/-]*\/?|\S+@\S+|ACM-[\w-]+)$/;

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== "api") walk(path);
    } else if (path.endsWith(".tsx")) files.push(path);
  }
};
ROOTS.forEach(walk);

const looksEnglish = (text) => {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || ALLOWED.has(t) || TECHNICAL.test(t)) return false;
  return /[A-Za-z]{2,}/.test(t.replace(/AcadeMe/g, ""));
};

const problems = [];
for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const report = (node, text) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    problems.push(`${relative(process.cwd(), file)}:${line + 1}  ${JSON.stringify(text.replace(/\s+/g, " ").trim())}`);
  };
  const visit = (node) => {
    if (ts.isJsxText(node) && looksEnglish(node.getText())) report(node, node.getText());
    if (ts.isJsxAttribute(node) && READ_ATTRS.has(node.name.getText()) && node.initializer) {
      const init = node.initializer;
      if (ts.isStringLiteral(init) && looksEnglish(init.text)) report(node, init.text);
      if (
        ts.isJsxExpression(init) &&
        init.expression &&
        ts.isStringLiteral(init.expression) &&
        looksEnglish(init.expression.text)
      ) {
        report(node, init.expression.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (problems.length) {
  console.error(
    `English written straight into ${problems.length} place(s); move it to src/lib/i18n/messages (docs/i18n.md):\n`,
  );
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`No hard-coded English in ${files.length} pages and components.`);
