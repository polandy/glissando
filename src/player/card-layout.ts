import { graphemes } from "./caption";
import { CARD_INK_COLORS, CARD_STYLE_SPECS, type CardTextSpec } from "./card-style-table";
import type { Size } from "./ken-burns";
import type { Card } from "./slideshow";

/**
 * A title card's breaking and position rules (ADR-0032, `dev-docs/player/TITLE_CARDS.md` §
 * Look). Pure geometry; the style table itself lives in `card-style-table.ts`, re-exported here
 * so callers need only this one module. The renderers and the editor's preview draw from the
 * same numbers.
 */

export { CARD_INK_COLORS, CARD_STYLE_SPECS };
export type { CardTextSpec };

/** The subtitle's top sits this many title-font-sizes below the title's bottom. */
export const CARD_SUBTITLE_GAP_EM = 0.35;

/** A line is at most this share of the stage width. */
export const CARD_MAX_WIDTH_SHARE = 0.8;
export const CARD_MAX_LINES = 2;
export const CARD_BOLD_MAX_LINES = 3;
/** The title shrinks no smaller than this fraction of its style's size before it ellipsises. */
export const CARD_MIN_SCALE = 0.5;
export const CARD_ELLIPSIS = "…";

export const CARD_MARGIN_LEFT_SHARE = 0.07;
export const CARD_MARGIN_BOTTOM_SHARE = 0.09;

export interface CardBreak {
  readonly lines: readonly string[];
  /** 1 at the style's own size, down to `CARD_MIN_SCALE`. */
  readonly scale: number;
}

/**
 * Breaks `text` between words into at most `maxLines` lines no wider than `maxWidth`, as
 * `measure(line, scale)` reports widths at a shrink `scale`. Tries scale 1 first, then shrinks
 * down to `CARD_MIN_SCALE`; what still does not fit at the smallest scale ends in an ellipsis.
 * Follows `breakCaption`'s pattern (`caption-layout.ts`), generalised to several lines and a
 * shrinking scale.
 */
export function breakCard(
  text: string,
  maxWidth: number,
  measure: (text: string, scale: number) => number,
  maxLines: number,
): CardBreak {
  const SCALE_STEPS = 16;
  for (let step = 0; step <= SCALE_STEPS; step += 1) {
    const scale = 1 - (step / SCALE_STEPS) * (1 - CARD_MIN_SCALE);
    const fits = (line: string) => measure(line, scale) <= maxWidth;
    const { lines, remainder } = wrapGreedy(text, fits, maxLines);
    if (remainder === "") {
      return { lines, scale };
    }
  }
  const fits = (line: string) => measure(line, CARD_MIN_SCALE) <= maxWidth;
  const { lines } = wrapGreedy(text, fits, maxLines);
  const lastIndex = Math.max(0, lines.length - 1);
  const last = lines[lastIndex] ?? "";
  const ellipsized = withEllipsis(last, fits);
  return { lines: [...lines.slice(0, lastIndex), ellipsized], scale: CARD_MIN_SCALE };
}

/**
 * Greedily fills at most `maxLines` lines, each word only ever joining a line that still fits;
 * `remainder` is what did not fit, "" if all of it did. A word too wide for an empty line at
 * this scale fails the whole attempt, leaving the shrink in `breakCard` to try a smaller one.
 */
function wrapGreedy(
  text: string,
  fits: (line: string) => boolean,
  maxLines: number,
): { lines: readonly string[]; remainder: string } {
  let words = text.split(" ");
  const lines: string[] = [];
  while (lines.length < maxLines && words.length > 0) {
    const { line, consumed } = nextLine(words, fits);
    if (consumed === 0) {
      return { lines, remainder: words.join(" ") };
    }
    lines.push(line);
    words = words.slice(consumed);
  }
  return { lines, remainder: words.join(" ") };
}

function nextLine(
  words: readonly string[],
  fits: (line: string) => boolean,
): { line: string; consumed: number } {
  let line = "";
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] as string;
    const longer = line === "" ? word : `${line} ${word}`;
    if (fits(longer)) {
      line = longer;
      continue;
    }
    if (line === "") {
      return { line: "", consumed: 0 };
    }
    return { line, consumed: index };
  }
  return { line, consumed: words.length };
}

function withEllipsis(text: string, fits: (line: string) => boolean): string {
  const prefix = longestFittingPrefix(text, (line) => fits(line.trimEnd() + CARD_ELLIPSIS), 0);
  return prefix.trimEnd() + CARD_ELLIPSIS;
}

/** Counted in graphemes, never cut inside one; never shorter than `minimumCharacters`. */
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

export interface CardLine {
  readonly text: string;
  /** The left edge in `"left"` alignment, the centre in `"center"`. */
  readonly x: number;
  /** The top of this line's box. */
  readonly y: number;
  readonly fontSizePx: number;
  readonly lineHeightPx: number;
}

export interface CardLayout {
  readonly align: "left" | "center";
  readonly titleLines: readonly CardLine[];
  readonly subtitleLines: readonly CardLine[];
}

/**
 * Lays `card`'s title and subtitle out for a `stage` of this pixel size, breaking each through
 * `measureTitle`/`measureSubtitle` (`(text, scale) => width`, see `breakCard`). Both renderers
 * and the editor's preview draw from the same lines.
 */
export function layoutCard(
  card: Card,
  stage: Size,
  measureTitle: (text: string, scale: number) => number,
  measureSubtitle: (text: string, scale: number) => number,
): CardLayout {
  const spec = CARD_STYLE_SPECS[card.style];
  const maxWidth = stage.width * CARD_MAX_WIDTH_SHARE;
  const maxLines = card.style === "bold" ? CARD_BOLD_MAX_LINES : CARD_MAX_LINES;
  const align = card.position === "bottom-left" || card.style === "bold" ? "left" : "center";

  const title = textBlock(card.title, spec.title, stage, maxWidth, measureTitle, maxLines);
  const subtitle =
    card.subtitle === undefined
      ? undefined
      : textBlock(card.subtitle, spec.subtitle, stage, maxWidth, measureSubtitle, 1);

  const gapPx = subtitle === undefined ? 0 : CARD_SUBTITLE_GAP_EM * title.fontSizePx;
  const titleBlockHeight = title.lines.length * title.lineHeightPx;
  const subtitleBlockHeight =
    subtitle === undefined ? 0 : subtitle.lines.length * subtitle.lineHeightPx;
  const totalHeight = titleBlockHeight + gapPx + subtitleBlockHeight;

  const topY =
    card.position === "bottom-left"
      ? stage.height * (1 - CARD_MARGIN_BOTTOM_SHARE) - totalHeight
      : (stage.height - totalHeight) / 2;
  const x = align === "left" ? stage.width * CARD_MARGIN_LEFT_SHARE : stage.width / 2;

  const titleLines = linesAt(title, x, topY);
  const subtitleTopY = topY + titleBlockHeight + gapPx;
  const subtitleLines = subtitle === undefined ? [] : linesAt(subtitle, x, subtitleTopY);

  return { align, titleLines, subtitleLines };
}

interface MeasuredBlock {
  readonly lines: readonly string[];
  readonly fontSizePx: number;
  readonly lineHeightPx: number;
}

function textBlock(
  text: string,
  spec: CardTextSpec,
  stage: Size,
  maxWidth: number,
  measure: (text: string, scale: number) => number,
  maxLines: number,
): MeasuredBlock {
  const sized = spec.uppercase ? text.toUpperCase() : text;
  const { lines, scale } = breakCard(sized, maxWidth, measure, maxLines);
  const fontSizePx = spec.sizeFractionOfHeight * stage.height * scale;
  return { lines, fontSizePx, lineHeightPx: fontSizePx * spec.lineHeightEm };
}

function linesAt(block: MeasuredBlock, x: number, topY: number): readonly CardLine[] {
  return block.lines.map((text, index) => ({
    text,
    x,
    y: topY + index * block.lineHeightPx,
    fontSizePx: block.fontSizePx,
    lineHeightPx: block.lineHeightPx,
  }));
}
