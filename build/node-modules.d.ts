/**
 * The parts of Node's modules the build plugins use; the project's types describe the browser
 * only (see server/node-modules.d.ts).
 */

declare module "node:child_process" {
  export function execFileSync(
    file: string,
    args: readonly string[],
    options: { encoding: "utf8"; stdio: readonly ("ignore" | "pipe")[] },
  ): string;
}

declare module "node:fs" {
  export function readFileSync(path: URL, encoding: "utf8"): string;
}
