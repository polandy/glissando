/** The string the build replaces with the precache list (`build/service-worker-plugin.ts`). */
export const PRECACHE_PLACEHOLDER = "__GLISSANDO_PRECACHE__";

/** Every file of one build, relative to the service worker, and that build's version. */
export interface Precache {
  readonly version: string;
  readonly files: readonly string[];
}

const PRECACHE_KEYS = ["files", "version"];

export function parsePrecache(written: string): Precache {
  let parsed: unknown;
  try {
    parsed = JSON.parse(written);
  } catch (error) {
    throw new Error(`the precache list is missing: the build did not write it into sw.js`, {
      cause: error,
    });
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Object.keys(parsed).sort().join() !== PRECACHE_KEYS.join() ||
    !("version" in parsed && typeof parsed.version === "string") ||
    !("files" in parsed && Array.isArray(parsed.files)) ||
    !parsed.files.every((file): file is string => typeof file === "string")
  ) {
    throw new Error(`the precache list is invalid: ${written}`);
  }
  return { version: parsed.version, files: parsed.files };
}
