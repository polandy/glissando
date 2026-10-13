import { escapeHtml, escapeStyle, jsonBlock } from "../html-export/page.ts";
import { assertInlineableScript } from "../html-export/inline-script.ts";
import { REMOTE_WORDS_BLOCK_ID } from "./remote-page-contract.ts";
import type { RemotePageLanguages } from "./remote-page-words.ts";

/** Nothing loads from outside the file; the page talks to its own origin only. */
export const REMOTE_PAGE_CONTENT_SECURITY_POLICY =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "font-src data:; connect-src 'self'";

/** Shown until the page knows the phone's language. */
const DEFAULT_LANG = "en";
const DEFAULT_TITLE = "Glissando";

export interface RemotePageParts {
  readonly languages: RemotePageLanguages;
  /** `@font-face` rules with their fonts as data URLs. */
  readonly fontFaces: string;
  /** The page's CSS, design tokens included. */
  readonly style: string;
  readonly script: string;
}

/**
 * The page a remote opens, `remote.html` in the build: the same for every secret, with its
 * style, fonts, words and script inline (dev-docs/tv_remote/REMOTE_PAGE.md). Throws on a script
 * that cannot be inlined unchanged (`assertInlineableScript`).
 */
export function remotePageHtml(parts: RemotePageParts): string {
  assertInlineableScript(parts.script, "the remote page's script");
  const noscript = Object.values(parts.languages)
    .map(({ noscript: words }) => `<p>${escapeHtml(words)}</p>`)
    .join("");
  return [
    "<!doctype html>",
    `<html lang="${DEFAULT_LANG}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<meta http-equiv="Content-Security-Policy" content="${REMOTE_PAGE_CONTENT_SECURITY_POLICY}">`,
    // The secret is in the page's URL; no request may carry it on.
    '<meta name="referrer" content="no-referrer">',
    `<title>${DEFAULT_TITLE}</title>`,
    `<style>${escapeStyle(parts.fontFaces)}\n${escapeStyle(parts.style)}</style>`,
    "</head>",
    "<body>",
    `<noscript>${noscript}</noscript>`,
    jsonBlock(REMOTE_WORDS_BLOCK_ID, parts.languages),
    `<script>${parts.script}</script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
