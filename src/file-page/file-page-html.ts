import {
  captionFontFace,
  cardFontFaceRules,
  escapeHtml,
  escapeStyle,
  jsonBlock,
  PAGE_CONTENT_SECURITY_POLICY,
  pageTail,
} from "../html-export/page.ts";
import type { PlayerBundle } from "../html-export/ports.ts";
import type { StoredCard, StoredSlideshow } from "../library/stored-slideshow.ts";
import { cardFontFilesOf } from "../player/card-fonts.ts";
import { FILE_WORDS_BLOCK_ID, type FilePageLanguages } from "./file-page-words.ts";

/** The export page's policy, plus the page's own folder: `glissando.json` and its media. */
export const FILE_PAGE_CONTENT_SECURITY_POLICY = `${PAGE_CONTENT_SECURITY_POLICY}; connect-src 'self'`;

/** Shown until the script knows the viewer's language. */
const DEFAULT_LANG = "en";

/** The file page's script, style and fonts, and its words in every language it speaks. */
export interface FilePageBundle extends PlayerBundle {
  readonly languages: FilePageLanguages;
}

/**
 * `index.html` inside a `.glissando` file (ADR-0038): a player for the unpacked folder around
 * it, with only the slideshow's title and the fonts its cards use baked in — the slideshow
 * itself comes from `glissando.json`, so an edited folder plays as edited. Throws on a script
 * that cannot be inlined unchanged (`assertInlineableScript`).
 */
export function filePageHtml(bundle: FilePageBundle, slideshow: StoredSlideshow): string {
  const shownCards = [slideshow.openingCard, slideshow.closingCard].filter(isShown);
  const cardFonts = cardFontFaceRules(cardFontFilesOf(shownCards), bundle.cardFontDataUrls);
  const noscript = Object.values(bundle.languages)
    .map(({ noscript: words }) => `<p>${escapeHtml(words)}</p>`)
    .join("");
  const head = [
    "<!doctype html>",
    `<html lang="${DEFAULT_LANG}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<meta http-equiv="Content-Security-Policy" content="${FILE_PAGE_CONTENT_SECURITY_POLICY}">`,
    `<title>${escapeHtml(slideshow.title)}</title>`,
    `<style>${captionFontFace(bundle.captionFontDataUrl)}\n${cardFonts.join("\n")}\n` +
      `${escapeStyle(bundle.style)}</style>`,
    "</head>",
    "<body>",
    `<noscript>${noscript}</noscript>`,
    jsonBlock(FILE_WORDS_BLOCK_ID, bundle.languages),
    "",
  ].join("\n");
  return head + pageTail(bundle.script);
}

/** An empty title leaves the card unshown (TITLE_SLIDES.md), so its fonts stay out. */
function isShown(card: StoredCard | undefined): card is StoredCard {
  return card !== undefined && card.title !== "";
}
