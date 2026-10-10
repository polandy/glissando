import { CAPTION_FONT_NAME, type Slideshow } from "../player";
import {
  COPY_BLOCK_ID,
  JSON_BLOCK_TYPE,
  MEDIA_BLOCK_TYPE,
  MEDIA_TYPE_ATTRIBUTE,
  SLIDESHOW_BLOCK_ID,
  type PageCopy,
} from "./page-contract";
import { assertInlineableScript } from "./inline-script";

/**
 * The exported page as text, in the order it is written: `pageHead`, one media block per medium
 * (`mediaBlockStart`, its base64, `MEDIA_BLOCK_END`), then `pageTail` with the player script, so
 * the script finds every block when it runs. See dev-docs/HTML_EXPORT.md, "The page".
 */

/** Nothing loads from outside the file; the decode worker starts from a `blob:` URL. */
export const PAGE_CONTENT_SECURITY_POLICY =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data: blob:; media-src data: blob:; font-src data:; worker-src blob:";

/** The weights the bundled variable caption font covers. */
const CAPTION_FONT_WEIGHTS = "400 600";

/** Everything the page holds before its media. */
export interface PageFrame {
  /** The app's language at export time, e.g. "de". */
  readonly lang: string;
  readonly title: string;
  /** Shown by a browser without JavaScript. */
  readonly noscript: string;
  readonly copy: PageCopy;
  /** Its pictures' `src` are `pictureKey(n)`, the music's `MUSIC_KEY`. */
  readonly slideshow: Slideshow;
  /** The page's CSS. */
  readonly style: string;
  readonly captionFontDataUrl: string;
}

export function pageHead(frame: PageFrame): string {
  const fontFace =
    `@font-face{font-family:"${CAPTION_FONT_NAME}";font-weight:${CAPTION_FONT_WEIGHTS};` +
    `src:url(${frame.captionFontDataUrl}) format("woff2")}`;
  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(frame.lang)}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<meta http-equiv="Content-Security-Policy" content="${PAGE_CONTENT_SECURITY_POLICY}">`,
    `<title>${escapeHtml(frame.title)}</title>`,
    `<style>${fontFace}\n${escapeStyle(frame.style)}</style>`,
    "</head>",
    "<body>",
    `<noscript><p>${escapeHtml(frame.noscript)}</p></noscript>`,
    jsonBlock(SLIDESHOW_BLOCK_ID, frame.slideshow),
    jsonBlock(COPY_BLOCK_ID, frame.copy),
    "",
  ].join("\n");
}

export function mediaBlockStart(key: string, mimeType: string): string {
  return (
    `<script type="${MEDIA_BLOCK_TYPE}" id="${escapeHtml(key)}" ` +
    `${MEDIA_TYPE_ATTRIBUTE}="${escapeHtml(mimeType)}">`
  );
}

export const MEDIA_BLOCK_END = "</script>\n";

/** Throws on a player script that cannot be inlined unchanged (`assertInlineableScript`). */
export function pageTail(playerScript: string): string {
  assertInlineableScript(playerScript, "the player script");
  return `<script>${playerScript}</script>\n</body>\n</html>\n`;
}

function jsonBlock(id: string, value: unknown): string {
  // `<` is still JSON, and no `<` means no `</script` or `<!--` can end the block early.
  const json = JSON.stringify(value).replaceAll("<", "\\u003c");
  return `<script type="${JSON_BLOCK_TYPE}" id="${id}">${json}</script>`;
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

function escapeStyle(style: string): string {
  return style.replace(/<\/(style)/gi, "<\\/$1");
}
