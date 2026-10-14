import type { CardTextSpec } from "./card-style-table";
import type { Size } from "./ken-burns";
import type { MeasureLine } from "./card-style";

/**
 * A `MeasureLine` for `cardStyles`, backed by a Canvas 2D context (the I/O edge `card-style.ts`
 * stays pure of): the DOM renderer's and the app's editor preview's own text, not drawn on the
 * canvas itself.
 */
export function canvasCardMeasure(spec: CardTextSpec, stage: Size): MeasureLine {
  const context = measuringContext();
  return (text, scale) => {
    const sizePx = spec.sizeFractionOfHeight * stage.height * scale;
    context.font = `${spec.italic ? "italic " : ""}${spec.fontWeight} ${sizePx}px ${spec.fontFamily}`;
    withLetterSpacing(context, spec.trackingEm * sizePx);
    return context.measureText(text).width;
  };
}

function measuringContext(): CanvasRenderingContext2D {
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) {
    throw new Error("this browser has no 2D canvas to measure card text with");
  }
  return context;
}

/** `letterSpacing` is a newer `CanvasRenderingContext2D` property; harmless where it is absent. */
function withLetterSpacing(context: CanvasRenderingContext2D, px: number): void {
  (context as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}
