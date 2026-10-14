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
import { downscaledBlurPlan, gaussianBlur } from "./box-blur";

type Shadow = NonNullable<(typeof CARD_INK_COLORS)[keyof typeof CARD_INK_COLORS]["shadow"]>;

/**
 * Draws `card`'s title and subtitle into `canvas`, sized to the whole viewport, premultiplied
 * for the shaders (ADR-0032). Layout matches the DOM renderer's (`card-layout.ts`'s
 * `layoutCard`), measured through `card-measure.ts`'s own throwaway context so sizing never
 * depends on drawing order. Returns the title's rendered font size in px, which the renderer
 * needs to turn the card's drift from em into a screen-space fraction.
 */
export function rasterizeCard(canvas: HTMLCanvasElement, card: Card, viewport: Size): number {
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("this browser has no 2D canvas to draw title cards with");
  }
  context.clearRect(0, 0, canvas.width, canvas.height);

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

/**
 * Draws `sharp` (a `rasterizeCard` raster) into `target` with a static Gaussian blur of `sigmaPx`
 * pixels at `sharp`'s size: the `focus` entrance's cross-fade copy, made once, never per frame
 * (ADR-0032). `target` is scaled down per `downscaledBlurPlan`, so the copy costs milliseconds even
 * at a phone's full resolution; it is sampled by fractions of its size, so its own size is free.
 * Our own `gaussianBlur` rather than `CanvasRenderingContext2D.filter`: Safari/WebKit, a real PWA
 * target, does not support that property, which would otherwise silently draw the copy sharp.
 */
export function blurCardRaster(
  sharp: HTMLCanvasElement,
  target: HTMLCanvasElement,
  sigmaPx: number,
): void {
  const plan = downscaledBlurPlan({ width: sharp.width, height: sharp.height }, sigmaPx);
  target.width = plan.size.width;
  target.height = plan.size.height;
  const context = target.getContext("2d");
  if (context === null) {
    throw new Error("this browser has no 2D canvas to blur title cards with");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(sharp, 0, 0, target.width, target.height);
  const blurred = gaussianBlur(context.getImageData(0, 0, target.width, target.height), plan.sigma);
  context.putImageData(new ImageData(blurred.data, blurred.width, blurred.height), 0, 0);
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
