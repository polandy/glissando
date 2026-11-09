import { describe, expect, it } from "vitest";
import { findUnusedExports, type Finding } from "./analyse.ts";

const everything: (path: string) => boolean = () => true;
const onlyLib = (path: string) => path.startsWith("src/lib");

function run(sources: Record<string, string>, isChecked = everything): Finding[] {
  const files = Object.entries(sources).map(([path, text]) => ({ path, text }));
  return findUnusedExports(files, isChecked);
}
const names = (findings: Finding[]) => findings.map((f) => `${f.name}:${f.action}`);

describe("findUnusedExports", () => {
  it.each([
    {
      title: "an export nobody imports is to be deleted",
      sources: { "src/lib/a.ts": "export const a = 1;\nexport function b() {}" },
      expected: ["a:delete", "b:delete"],
    },
    {
      title: "an imported export is used, an unimported sibling is not",
      sources: {
        "src/lib/a.ts": "export const a = 1;\nexport const b = 2;",
        "src/lib/c.ts": "import { a } from './a';\nexport const c = a;",
      },
      expected: ["b:delete", "c:delete"],
    },
    {
      title: "an export used only inside its own module loses the export",
      sources: { "src/lib/a.ts": "export const a = 1;\nconsole.log(a);" },
      expected: ["a:unexport"],
    },
    {
      title: "an export used by its own test is used",
      sources: {
        "src/lib/a.ts": "export function a() {}",
        "src/lib/a.test.ts": "import { a } from './a';\na();",
      },
      expected: [],
    },
    {
      title: "an import under a local alias counts for the original name",
      sources: {
        "src/lib/a.ts": "export const a = 1;",
        "e2e/x.ts": "import { a as renamed } from '../src/lib/a.ts';\nrenamed;",
      },
      expected: [],
    },
    {
      title: "a namespace import uses everything",
      sources: {
        "src/lib/a.ts": "export const a = 1;\nexport const b = 2;",
        "src/lib/c.ts": "import * as all from './a';\nall;",
      },
      expected: [],
    },
    {
      title: "a dynamic import uses everything",
      sources: {
        "src/lib/a.ts": "export const a = 1;",
        "src/lib/c.ts": "const m = await import('./a');\nm;",
      },
      expected: [],
    },
    {
      title: "a re-export through a barrel uses the original, and the barrel's name must be used",
      sources: {
        "src/lib/a.ts": "export const a = 1;",
        "src/lib/index.ts": "export { a } from './a';",
        "src/lib/c.ts": "import { a } from './index';\na;",
      },
      expected: [],
    },
    {
      title: "an import from a directory resolves to its index",
      sources: {
        "src/lib/dir/index.ts": "export const a = 1;",
        "src/lib/c.ts": "import { a } from './dir';\na;",
      },
      expected: [],
    },
    {
      title: "a svelte file's script imports count as uses",
      sources: {
        "src/lib/a.ts": "export const a = 1;",
        "src/lib/V.svelte": "<script lang=\"ts\">\n  import { a } from './a';\n</script>\n{a}",
      },
      expected: [],
    },
    {
      title: "types, interfaces, classes and export lists are all exports",
      sources: {
        "src/lib/a.ts":
          "export type T = 1;\nexport interface I {}\nexport class K {}\nconst z = 1;\nexport { z };",
      },
      expected: ["T:delete", "I:delete", "K:delete", "z:delete"],
    },
    {
      title: "a value that only a typeof query reads stays exported",
      sources: {
        "src/lib/a.ts":
          "export const KEYS = ['a'] as const;\nexport type Key = (typeof KEYS)[number];\nconsole.log(null as Key | null);",
      },
      expected: [],
    },
    {
      title: "a type used inside its own module stays exported, it may appear in signatures",
      sources: {
        "src/lib/a.ts":
          "export interface Opts {}\nexport type Id = string;\nconsole.log(null as Opts | Id);",
      },
      expected: [],
    },
    {
      title: "files outside the judged set may use exports but are not reported",
      sources: {
        "src/lib/a.ts": "export const a = 1;",
        "e2e/x.ts": "import { a } from '../src/lib/a';\nexport const unused = a;",
      },
      expected: [],
      isChecked: onlyLib,
    },
  ])("$title", ({ sources, expected, isChecked }) => {
    expect(names(run(sources, isChecked))).toEqual(expected);
  });

  it("reports the line of the declaration, also in a svelte-adjacent ts file", () => {
    const [finding] = run({ "src/lib/a.ts": "\n\nexport const a = 1;" });
    expect(finding?.line).toBe(3);
  });
});
