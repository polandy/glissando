import { describe, expect, it } from "vitest";
import { CARD_FOCUS_BLUR_SHARE } from "../card-timing";
import type { Card } from "../slideshow";
import { rasterizeCard } from "./card-raster";

const VIEWPORT = { width: 400, height: 400 };
/** Not fully transparent nor fully opaque: an anti-aliased or blurred edge pixel. */
const MIN_PARTIAL_ALPHA = 5;
const MAX_PARTIAL_ALPHA = 250;

function baseCard(overrides: Partial<Card> = {}): Card {
  return {
    title: "LLLL",
    style: "modern",
    position: "centre",
    ink: "light",
    entrance: "focus",
    ...overrides,
  };
}

/** How many pixels sit on a partly-covered edge: wider for a blurred raster than a sharp one. */
function partialAlphaCount(canvas: HTMLCanvasElement): number {
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("this browser has no 2D canvas to read a card raster with");
  }
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let count = 0;
  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index] ?? 0;
    if (alpha > MIN_PARTIAL_ALPHA && alpha < MAX_PARTIAL_ALPHA) {
      count++;
    }
  }
  return count;
}

describe("rasterizeCard", () => {
  it("draws a static blur for the focus entrance's cross-fade copy, once, not per frame", () => {
    const card = baseCard();
    const sharpCanvas = document.createElement("canvas");
    rasterizeCard(sharpCanvas, card, VIEWPORT);
    const blurredCanvas = document.createElement("canvas");
    rasterizeCard(blurredCanvas, card, VIEWPORT, CARD_FOCUS_BLUR_SHARE * VIEWPORT.height);

    const sharpEdge = partialAlphaCount(sharpCanvas);
    const blurredEdge = partialAlphaCount(blurredCanvas);

    expect(blurredEdge).toBeGreaterThan(sharpEdge);
  });
});
