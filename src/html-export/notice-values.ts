import type { BundledNotice } from "./ports.ts";

/** What a notice's fields may hold: nothing that could end an HTML comment (`-->`, `--!>`). */
const SAFE_NOTICE_VALUE = /^[\w@/.:+-]+$/;

/**
 * Throws on a notice the page's HTML comment cannot hold. The build checks each package's
 * notice, so an odd `package.json` fails the build rather than every later export.
 */
export function assertCommentSafe(notice: BundledNotice): void {
  for (const value of Object.values(notice)) {
    if (!SAFE_NOTICE_VALUE.test(value) || value.includes("--")) {
      throw new Error(`"${value}" cannot go into the page's HTML comment of bundled packages`);
    }
  }
}
