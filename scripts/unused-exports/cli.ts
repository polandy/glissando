// Reads the repository and prints unused exports, one per line, with what to do about each.
import { readdirSync, readFileSync } from "node:fs";
import { findUnusedExports, type SourceFile } from "./analyse.ts";

const SOURCE_PATTERN = /\.(ts|svelte|js|mjs)$/;
const SKIPPED = [
  "node_modules",
  "dist",
  ".git",
  "src/import/libav",
  "test-results",
  "playwright-report",
];
const CATALOGUE = /^src\/app\/i18n\/catalogue-[^/]*\.ts$/;
const ROOTS = ["src", "server", "e2e", "scripts", "build", "deploy"];

function walk(dir: string, into: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = dir === "." ? entry.name : `${dir}/${entry.name}`;
    if (SKIPPED.some((s) => path === s || path.startsWith(`${s}/`))) continue;
    if (entry.isDirectory()) walk(path, into);
    else if (SOURCE_PATTERN.test(entry.name)) into.push(path);
  }
}

const paths: string[] = [];
for (const root of ROOTS) walk(root, paths);
// Config files at the repository root (vite.config.ts and friends) use exports too.
for (const entry of readdirSync(".")) if (/\.config\.(ts|js|mjs)$/.test(entry)) paths.push(entry);

const files: SourceFile[] = paths.map((path) => ({ path, text: readFileSync(path, "utf8") }));
// Judged: the app and the server. Entry modules (main.ts) export nothing the rest imports.
const judged = (path: string) =>
  (path.startsWith("src/") || path.startsWith("server/")) && !CATALOGUE.test(path);

const findings = findUnusedExports(files, judged);
for (const f of findings) {
  const todo =
    f.action === "delete"
      ? "unused anywhere: delete it (and any test of it)"
      : "used only inside its own module: drop the `export`";
  console.log(`FAIL ${f.path}:${f.line} ${f.name} — ${todo}`);
}
process.exit(findings.length === 0 ? 0 : 1);
