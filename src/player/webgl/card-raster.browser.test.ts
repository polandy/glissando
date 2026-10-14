import { describe, expect, it } from "vitest";
import { CARD_FOCUS_BLUR_SHARE } from "../card-timing";
import type { Card } from "../slideshow";
import { blurCardRaster, rasterizeCard } from "./card-raster";

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

/** The share of pixels on a partly-covered edge: larger for a blurred raster than a sharp one,
 * whatever size each is drawn at. */
function partialAlphaShare(canvas: HTMLCanvasElement): number {
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
  return count / (canvas.width * canvas.height);
}

describe("blurCardRaster", () => {
  it("draws the focus entrance's cross-fade copy blurred", () => {
    const sharpCanvas = document.createElement("canvas");
    rasterizeCard(sharpCanvas, baseCard(), VIEWPORT);
    const blurredCanvas = document.createElement("canvas");
    blurCardRaster(sharpCanvas, blurredCanvas, CARD_FOCUS_BLUR_SHARE * VIEWPORT.height);

    expect(partialAlphaShare(blurredCanvas)).toBeGreaterThan(partialAlphaShare(sharpCanvas));
  });

  it("blurs a phone-sized raster on a scaled-down copy, never at full size", () => {
    const phone = { width: 1082, height: 2202 };
    const sharpCanvas = document.createElement("canvas");
    rasterizeCard(sharpCanvas, baseCard(), phone);
    const blurredCanvas = document.createElement("canvas");
    blurCardRaster(sharpCanvas, blurredCanvas, CARD_FOCUS_BLUR_SHARE * phone.height);

    expect(sharpCanvas.width * sharpCanvas.height).toBe(phone.width * phone.height);
    expect(blurredCanvas.width * blurredCanvas.height).toBeLessThan(
      (phone.width * phone.height) / 10,
    );
  });
});
