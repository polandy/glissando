import { assertCommentSafe } from "../src/html-export/notice-values.ts";
import type { BundledNotice } from "../src/html-export/ports.ts";

const NODE_MODULES = "node_modules/";
const GIT_URL_PREFIX = /^git\+/;
const GIT_URL_SUFFIX = /\.git$/;

type ReadFile = (path: string) => Promise<Uint8Array>;

/**
 * The npm packages among a chunk's modules, each once in first-seen order, with the version,
 * licence and source their package.json names. A package without a licence or a source fails
 * the build: the page's head must name them.
 */
export async function bundledNotices(
  moduleIds: readonly string[],
  readFile: ReadFile,
): Promise<readonly BundledNotice[]> {
  const directories = [...new Set(moduleIds.flatMap((id) => packageDirectory(id) ?? []))];
  return Promise.all(directories.map((directory) => noticeOf(directory, readFile)));
}

/** The package directory a module id lies in: the innermost `node_modules/<name>`. */
function packageDirectory(moduleId: string): string | undefined {
  const path = moduleId.split("?")[0] ?? moduleId;
  const at = path.lastIndexOf(NODE_MODULES);
  if (at < 0) return undefined;
  const start = at + NODE_MODULES.length;
  const segments = path.slice(start).split("/");
  const nameLength = segments[0]?.startsWith("@") ? 2 : 1;
  return path.slice(0, start) + segments.slice(0, nameLength).join("/");
}

async function noticeOf(directory: string, readFile: ReadFile): Promise<BundledNotice> {
  const manifest: unknown = JSON.parse(
    new TextDecoder().decode(await readFile(`${directory}/package.json`)),
  );
  const field = (key: string): unknown =>
    typeof manifest === "object" && manifest !== null
      ? (manifest as Record<string, unknown>)[key]
      : undefined;
  const name = field("name");
  const version = field("version");
  const license = field("license");
  if (typeof name !== "string" || typeof version !== "string") {
    throw new Error(`${directory}/package.json names no name or version`);
  }
  if (typeof license !== "string") {
    throw new Error(`${name} names no licence in its package.json; the page's head must name it`);
  }
  const repository = field("repository");
  const url =
    typeof repository === "string"
      ? repository
      : typeof repository === "object" && repository !== null
        ? (repository as Record<string, unknown>)["url"]
        : undefined;
  if (typeof url !== "string") {
    throw new Error(`${name} names no source repository in its package.json`);
  }
  const notice: BundledNotice = {
    name,
    version,
    licenseId: license,
    sourceUrl: url.replace(GIT_URL_PREFIX, "").replace(GIT_URL_SUFFIX, ""),
  };
  assertCommentSafe(notice);
  return notice;
}
