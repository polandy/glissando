import type { StoredSlideshow } from "../../library/stored-slideshow";
import { filePageHtml } from "../file-page-html";

/**
 * `index.html` for `slideshow`'s `.glissando` file. The page built by `build/file-page-plugin.ts`
 * sits in its own chunk: fetched on the first export, and precached for offline use like every
 * built file (ADR-0005).
 */
export async function bundledFilePage(slideshow: StoredSlideshow): Promise<string> {
  return filePageHtml((await import("virtual:glissando-file-page")).default, slideshow);
}
