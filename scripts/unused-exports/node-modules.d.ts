/**
 * The parts of Node's modules the unused-exports check uses; the project's types describe the
 * browser only (see server/node-modules.d.ts, which also declares node:process).
 */

declare module "node:fs" {
  interface DirectoryEntry {
    readonly name: string;
    isDirectory(): boolean;
  }
  export function readdirSync(path: string): string[];
  export function readdirSync(path: string, options: { withFileTypes: true }): DirectoryEntry[];
  export function readFileSync(path: string, encoding: "utf8"): string;
}
