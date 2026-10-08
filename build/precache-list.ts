import { PRECACHE_PLACEHOLDER, type Precache } from "../src/sw/precache.ts";

/** The service worker's own file; it is not part of what it caches. */
export const SERVICE_WORKER_FILE = "sw.js";

export interface BuiltFile {
  /** Relative to the app root, as the service worker requests it. */
  readonly path: string;
  readonly content: string | Uint8Array;
}

const VERSION_LENGTH = 16;
const HASH = "SHA-256";
const HEX = 16;
const BYTE_HEX_DIGITS = 2;

/** What the service worker caches and its version: any change of a file is a new version. */
export async function precacheFor(files: readonly BuiltFile[]): Promise<Precache> {
  const cached = files
    .filter((file) => file.path !== SERVICE_WORKER_FILE)
    .sort((a, b) => (a.path < b.path ? -1 : 1));
  const lines = await Promise.all(
    cached.map(async (file) => `${file.path}\0${await sha256(file.content)}\n`),
  );
  return {
    version: (await sha256(lines.join(""))).slice(0, VERSION_LENGTH),
    files: cached.map((file) => file.path),
  };
}

async function sha256(content: string | Uint8Array): Promise<string> {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  const digest = new Uint8Array(await crypto.subtle.digest(HASH, new Uint8Array(bytes)));
  return [...digest].map((byte) => byte.toString(HEX).padStart(BYTE_HEX_DIGITS, "0")).join("");
}

// The minifier may quote it either way, a template literal included.
const QUOTED_PLACEHOLDER = new RegExp("([\"'`])" + PRECACHE_PLACEHOLDER + "\\1", "g");

/** Writes the list into the service worker's code as a string literal, in place of the placeholder. */
export function writePrecache(code: string, precache: Precache): string {
  const found = code.match(QUOTED_PLACEHOLDER)?.length ?? 0;
  if (found !== 1) {
    throw new Error(
      `${SERVICE_WORKER_FILE} must contain the placeholder ${PRECACHE_PLACEHOLDER} once, found it ${found} times`,
    );
  }
  return code.replace(QUOTED_PLACEHOLDER, () => JSON.stringify(JSON.stringify(precache)));
}
