import {
  captionFontFace,
  escapeHtml,
  escapeStyle,
  jsonBlock,
  PAGE_CONTENT_SECURITY_POLICY,
} from "../html-export/page.ts";
import { assertInlineableScript } from "../html-export/inline-script.ts";
import { SHARE_WORDS_BLOCK_ID } from "./share-page-contract.ts";
import type { SharePageLanguages } from "./share-page-words.ts";

const SELF = "'self'";
const DIRECTIVE_SEPARATOR = "; ";

/** The sources the share page adds to the export page's policy, by directive. */
const SHARE_PAGE_SOURCES: Readonly<Record<string, readonly string[]>> = {
  "connect-src": [SELF, "blob:"],
  "img-src": [SELF],
  "media-src": [SELF],
};

/** The export page's policy, plus the page's own origin for the slideshow, pictures and songs. */
export const SHARE_PAGE_CONTENT_SECURITY_POLICY = withSources(
  PAGE_CONTENT_SECURITY_POLICY,
  SHARE_PAGE_SOURCES,
);

/** Shown until the page knows the recipient's language. */
const DEFAULT_LANG = "en";
const DEFAULT_TITLE = "Glissando";

export interface SharePageParts {
  readonly languages: SharePageLanguages;
  /** The page's CSS, design tokens included. */
  readonly style: string;
  readonly captionFontDataUrl: string;
  readonly script: string;
}

/**
 * The page a share link opens, `share.html` in the build: the same for every token, with its
 * style, font, words and script inline (dev-docs/SHARE_LINK.md, The recipient's page). Throws on
 * a script that cannot be inlined unchanged (`assertInlineableScript`).
 */
export function sharePageHtml(parts: SharePageParts): string {
  assertInlineableScript(parts.script, "the share page's script");
  const noscript = Object.values(parts.languages)
    .map(({ noscript: words }) => `<p>${escapeHtml(words)}</p>`)
    .join("");
  return [
    "<!doctype html>",
    `<html lang="${DEFAULT_LANG}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<meta http-equiv="Content-Security-Policy" content="${SHARE_PAGE_CONTENT_SECURITY_POLICY}">`,
    // The token is in the page's URL; no request may carry it on.
    '<meta name="referrer" content="no-referrer">',
    `<title>${DEFAULT_TITLE}</title>`,
    `<style>${captionFontFace(parts.captionFontDataUrl)}\n${escapeStyle(parts.style)}</style>`,
    "</head>",
    "<body>",
    `<noscript>${noscript}</noscript>`,
    jsonBlock(SHARE_WORDS_BLOCK_ID, parts.languages),
    `<script>${parts.script}</script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** `policy` with `added` put in front of each directive's sources, a missing directive appended. */
function withSources(policy: string, added: Readonly<Record<string, readonly string[]>>): string {
  const directives = policy.split(DIRECTIVE_SEPARATOR).map((directive) => directive.split(" "));
  const named = new Set(directives.map(([name]) => name));
  const widened = directives.map(([name = "", ...sources]) => [
    name,
    ...(added[name] ?? []),
    ...sources,
  ]);
  const appended = Object.entries(added)
    .filter(([name]) => !named.has(name))
    .map(([name, sources]) => [name, ...sources]);
  return [...widened, ...appended]
    .map((directive) => directive.join(" "))
    .join(DIRECTIVE_SEPARATOR);
}
