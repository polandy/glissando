import {
  CARD_INK_COLORS,
  CARD_STYLE_SPECS,
  layoutCard,
  type CardLine,
  type CardTextSpec,
} from "../card-layout";
import { canvasCardMeasure, withLetterSpacing } from "../card-measure";
import type { Size } from "../ken-burns";
import type { Card } from "../slideshow";

type Shadow = NonNullable<(typeof CARD_INK_COLORS)[keyof typeof CARD_INK_COLORS]["shadow"]>;

/**
 * Draws `card`'s title and subtitle into `canvas`, sized to the whole viewport, premultiplied
 * for the shaders (ADR-0032). Layout matches the DOM renderer's (`card-layout.ts`'s
 * `layoutCard`), measured through `card-measure.ts`'s own throwaway context so sizing never
 * depends on drawing order. Returns the title's rendered font size in px, which the renderer
 * needs to turn the card's drift from em into a screen-space fraction. `blurPx` rasterises a
 * `focus` entrance's cross-fade copy once with a static blur, never per frame (ADR-0032).
 */
export function rasterizeCard(
  canvas: HTMLCanvasElement,
  card: Card,
  viewport: Size,
  blurPx = 0,
): number {
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("this browser has no 2D canvas to draw title cards with");
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.filter = blurPx > 0 ? `blur(${blurPx}px)` : "none";

  const spec = CARD_STYLE_SPECS[card.style];
  const layout = layoutCard(
    card,
    viewport,
    canvasCardMeasure(spec.title, viewport),
    canvasCardMeasure(spec.subtitle, viewport),
  );
  const ink = CARD_INK_COLORS[card.ink];
  drawLines(context, layout.titleLines, spec.title, layout.align, ink.color, ink.shadow);
  drawLines(context, layout.subtitleLines, spec.subtitle, layout.align, ink.color, ink.shadow);

  return layout.titleLines[0]?.fontSizePx ?? spec.title.sizeFractionOfHeight * viewport.height;
}

function drawLines(
  context: CanvasRenderingContext2D,
  lines: readonly CardLine[],
  spec: CardTextSpec,
  align: "left" | "center",
  color: string,
  shadow: Shadow | undefined,
): void {
  context.textAlign = align;
  context.textBaseline = "middle";
  context.fillStyle = color;
  if (shadow === undefined) {
    context.shadowColor = "transparent";
    context.shadowOffsetY = 0;
    context.shadowBlur = 0;
  }
  for (const line of lines) {
    context.font = `${spec.italic ? "italic " : ""}${spec.fontWeight} ${line.fontSizePx}px ${spec.fontFamily}`;
    withLetterSpacing(context, spec.trackingEm * line.fontSizePx);
    if (shadow !== undefined) {
      context.shadowColor = shadow.color;
      context.shadowOffsetY = shadow.offsetYEm * line.fontSizePx;
      context.shadowBlur = shadow.blurEm * line.fontSizePx;
    }
    context.fillText(line.text, line.x, line.y + line.lineHeightPx / 2);
  }
}
