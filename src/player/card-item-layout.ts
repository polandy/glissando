import { itemGranularity, letterSegments, wordSegments, type TextSegment } from "./card-items";
import { CARD_STYLE_SPECS, type CardLayout, type CardLine } from "./card-layout";
import type { CardTextSpec } from "./card-style-table";
import type { Size } from "./ken-burns";
import type { Card } from "./slideshow";

/**
 * An entrance's items as slices of `layoutCard`'s lines (ADR-0032, `dev-docs/player/TITLE_CARDS.md`
 * § Entrances), split out of `card-layout.ts` to stay under the line limit. Pure; both renderers
 * draw each item at its own slice.
 */

export interface CardItemSlice {
  /** The slice's left edge, always a true left pixel coordinate, whatever the card's alignment. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** The rendered font size of the slice's own line, for converting its entrance's em drift. */
  readonly fontSizePx: number;
  /** The item's own text; "" for a whole-text entrance's single slice, never drawn on its own. */
  readonly text: string;
  /** Which block the slice belongs to, so a renderer can style it from the right half of the spec. */
  readonly part: "title" | "subtitle";
}

/**
 * `card`'s entrance items (`card-items.ts`'s `itemCount`) as slices of `layout`'s lines: a
 * whole-text entrance (`rise`/`focus`/`slow-fade`) is one slice, the tight box around every
 * line; `words`/`letters` slice each line at the measured width of its text before the item and
 * through it. In reading order, the title's items before the subtitle's.
 */
export function cardItemSlices(
  card: Pick<Card, "title" | "subtitle" | "entrance" | "style">,
  layout: CardLayout,
  stage: Size,
  measureTitle: (text: string, scale: number) => number,
  measureSubtitle: (text: string, scale: number) => number,
): readonly CardItemSlice[] {
  const granularity = itemGranularity(card.entrance);
  const spec = CARD_STYLE_SPECS[card.style];
  if (granularity === "block") {
    return [blockSlice(layout, measureTitle, measureSubtitle, spec, stage.height)];
  }
  const segmentsOf = granularity === "word" ? wordSegments : letterSegments;
  const titleScale = scaleOf(layout.titleLines, spec.title, stage.height);
  const subtitleScale = scaleOf(layout.subtitleLines, spec.subtitle, stage.height);
  return [
    ...lineSlices(layout.titleLines, layout.align, titleScale, measureTitle, segmentsOf, "title"),
    ...lineSlices(
      layout.subtitleLines,
      layout.align,
      subtitleScale,
      measureSubtitle,
      segmentsOf,
      "subtitle",
    ),
  ];
}

/** A line's own scale (1 at its style's own size), recovered from its already-shrunk font size. */
function scaleOf(lines: readonly CardLine[], spec: CardTextSpec, stageHeight: number): number {
  const first = lines[0];
  return first === undefined ? 1 : first.fontSizePx / (spec.sizeFractionOfHeight * stageHeight);
}

function lineBox(
  line: CardLine,
  align: "left" | "center",
  scale: number,
  measure: (text: string, scale: number) => number,
): { readonly x: number; readonly width: number } {
  const width = measure(line.text, scale);
  return { x: align === "center" ? line.x - width / 2 : line.x, width };
}

function lineSlices(
  lines: readonly CardLine[],
  align: "left" | "center",
  scale: number,
  measure: (text: string, scale: number) => number,
  segmentsOf: (text: string) => readonly TextSegment[],
  part: "title" | "subtitle",
): readonly CardItemSlice[] {
  const slices: CardItemSlice[] = [];
  for (const line of lines) {
    const { x: leftEdge } = lineBox(line, align, scale, measure);
    for (const segment of segmentsOf(line.text)) {
      const before = measure(line.text.slice(0, segment.index), scale);
      const through = measure(line.text.slice(0, segment.index + segment.text.length), scale);
      slices.push({
        x: leftEdge + before,
        y: line.y,
        width: through - before,
        height: line.lineHeightPx,
        fontSizePx: line.fontSizePx,
        text: segment.text,
        part,
      });
    }
  }
  return slices;
}

/** The tight box around every title and subtitle line, for a whole-text entrance's one item. */
function blockSlice(
  layout: CardLayout,
  measureTitle: (text: string, scale: number) => number,
  measureSubtitle: (text: string, scale: number) => number,
  spec: { readonly title: CardTextSpec; readonly subtitle: CardTextSpec },
  stageHeight: number,
): CardItemSlice {
  const titleScale = scaleOf(layout.titleLines, spec.title, stageHeight);
  const subtitleScale = scaleOf(layout.subtitleLines, spec.subtitle, stageHeight);
  const boxes = [
    ...layout.titleLines.map((line) => ({
      ...lineBox(line, layout.align, titleScale, measureTitle),
      line,
    })),
    ...layout.subtitleLines.map((line) => ({
      ...lineBox(line, layout.align, subtitleScale, measureSubtitle),
      line,
    })),
  ];
  const left = Math.min(...boxes.map((box) => box.x));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const top = Math.min(...boxes.map((box) => box.line.y));
  const bottom = Math.max(...boxes.map((box) => box.line.y + box.line.lineHeightPx));
  const fontSizePx = layout.titleLines[0]?.fontSizePx ?? layout.subtitleLines[0]?.fontSizePx ?? 0;
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    fontSizePx,
    text: "",
    part: "title",
  };
}
