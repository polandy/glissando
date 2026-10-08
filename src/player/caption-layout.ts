import { graphemes } from "./caption";
import type { Size } from "./ken-burns";

/**
 * Where a caption sits and how it breaks, in the pixels it is drawn in; the same numbers style
 * the DOM fallback and the picture editor's preview. See ADR-0007.
 */

export const CAPTION_FONT_FAMILY = '"Instrument Sans", sans-serif';
export const CAPTION_FONT_WEIGHT = 600;
export const CAPTION_LINE_HEIGHT_EM = 1.22;
export const CAPTION_LEFT_EM = 1.2;
export const CAPTION_BOTTOM_EM = 1.1;
/** A line is at most this share of the screen's width and at most `CAPTION_MAX_WIDTH_EM`. */
export const CAPTION_MAX_WIDTH_SHARE = 0.72;
export const CAPTION_MAX_WIDTH_EM = 34;
/** The gradient behind the caption covers this share of the screen from the bottom. */
export const CAPTION_BAND_SHARE = 0.42;
export const CAPTION_MAX_LINES = 2;
export const CAPTION_ELLIPSIS = "…";
/** Elliptical, from the bottom left: 120 % of the band's width by 100 % of its height. */
export const CAPTION_GRADIENT = {
  radiusXShare: 1.2,
  radiusYShare: 1,
  stops: [
    { at: 0, alpha: 0.5 },
    { at: 0.55, alpha: 0.18 },
    { at: 0.8, alpha: 0 },
  ],
} as const;
export const CAPTION_TEXT_COLOR = "#fff";
export const CAPTION_SHADOW = { color: "rgba(0, 0, 0, 0.35)", offsetYCssPx: 1, blurCssPx: 3 };

/** The type size follows the screen height, so a caption reads alike on a TV and a phone. */
export const CAPTION_MIN_FONT_SIZE_CSS_PX = 15;
const FONT_SIZE_PER_HEIGHT = 0.042;
/** Keeps a portrait phone's caption from crowding its narrow width. */
const FONT_SIZE_PER_WIDTH = 0.055;

export interface CaptionMetrics {
  readonly fontSize: number;
  readonly lineHeight: number;
  /** From the screen's left edge to the text. */
  readonly left: number;
  /** From the screen's bottom edge to the last line's bottom. */
  readonly bottom: number;
  readonly maxWidth: number;
  /** The gradient band's height in whole pixels, at least room for every line. */
  readonly bandHeight: number;
}

/**
 * `pixelsPerCssPixel` turns the CSS-pixel minimum type size into the viewport's pixels; a small
 * preview of the screen passes a smaller minimum to keep the player's proportions.
 */
export function captionMetrics(
  viewport: Size,
  pixelsPerCssPixel: number,
  minFontSizeCssPx = CAPTION_MIN_FONT_SIZE_CSS_PX,
): CaptionMetrics {
  const fontSize = Math.max(
    minFontSizeCssPx * pixelsPerCssPixel,
    Math.min(viewport.height * FONT_SIZE_PER_HEIGHT, viewport.width * FONT_SIZE_PER_WIDTH),
  );
  const lineHeight = fontSize * CAPTION_LINE_HEIGHT_EM;
  const bottom = fontSize * CAPTION_BOTTOM_EM;
  return {
    fontSize,
    lineHeight,
    left: fontSize * CAPTION_LEFT_EM,
    bottom,
    maxWidth: Math.min(viewport.width * CAPTION_MAX_WIDTH_SHARE, fontSize * CAPTION_MAX_WIDTH_EM),
    bandHeight: Math.ceil(
      Math.max(viewport.height * CAPTION_BAND_SHARE, bottom + CAPTION_MAX_LINES * lineHeight),
    ),
  };
}

/** The CSS `font` shorthand for a caption of `fontSize` pixels. */
export function captionFont(fontSize: number): string {
  return `${CAPTION_FONT_WEIGHT} ${fontSize}px ${CAPTION_FONT_FAMILY}`;
}

/**
 * Breaks `text` between words into at most two lines no wider than `maxWidth`, as `measure`
 * reports widths; a word too long for a line breaks between characters, and a second line that
 * cannot hold the rest ends in an ellipsis.
 */
export function breakCaption(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): readonly string[] {
  const fits = (line: string) => measure(line) <= maxWidth;
  if (fits(text)) {
    return [text];
  }
  const first = firstLine(text, fits);
  const rest = text.slice(first.length).trimStart();
  return [first, fits(rest) ? rest : withEllipsis(rest, fits)];
}

function firstLine(text: string, fits: (line: string) => boolean): string {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const longer = line === "" ? word : `${line} ${word}`;
    if (!fits(longer)) {
      return line === "" ? longestFittingPrefix(word, fits, 1) : line;
    }
    line = longer;
  }
  return line;
}

function withEllipsis(text: string, fits: (line: string) => boolean): string {
  const prefix = longestFittingPrefix(text, (line) => fits(line.trimEnd() + CAPTION_ELLIPSIS), 0);
  return prefix.trimEnd() + CAPTION_ELLIPSIS;
}

/** Counted in graphemes, never cut inside one; never shorter than `minimumCharacters`, even when that does not fit. */
function longestFittingPrefix(
  text: string,
  fits: (line: string) => boolean,
  minimumCharacters: number,
): string {
  const characters = graphemes(text);
  let count = characters.length;
  while (count > minimumCharacters && !fits(characters.slice(0, count).join(""))) {
    count -= 1;
  }
  return characters.slice(0, count).join("");
}
