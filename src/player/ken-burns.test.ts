import { describe, expect, it } from "vitest";
import { cropRect, framingAt } from "./ken-burns";
import type { KenBurns } from "./slideshow";

const LANDSCAPE = { width: 4000, height: 2000 };
const PORTRAIT = { width: 1000, height: 2000 };
const SQUARE_VIEWPORT = { width: 500, height: 500 };
const WIDE_VIEWPORT = { width: 1600, height: 900 };

describe("cropRect", () => {
  it("crops a wider picture at the sides to cover the viewport", () => {
    const centred = { zoom: 1, centerX: 0.5, centerY: 0.5 };

    expect(cropRect(centred, LANDSCAPE, SQUARE_VIEWPORT)).toEqual({
      x: 0.25,
      y: 0,
      width: 0.5,
      height: 1,
    });
  });

  it("crops a taller picture at top and bottom to cover the viewport", () => {
    const centred = { zoom: 1, centerX: 0.5, centerY: 0.5 };
    const crop = cropRect(centred, PORTRAIT, WIDE_VIEWPORT);

    expect(crop.width).toBe(1);
    expect(crop.height).toBeCloseTo(0.28125, 10);
    expect(crop.y).toBeCloseTo(0.359375, 10);
  });

  it("shows a smaller part of the picture when zoomed in", () => {
    const zoomed = { zoom: 2, centerX: 0.5, centerY: 0.5 };

    expect(cropRect(zoomed, LANDSCAPE, SQUARE_VIEWPORT)).toEqual({
      x: 0.375,
      y: 0.25,
      width: 0.25,
      height: 0.5,
    });
  });

  it("keeps the crop inside the picture when the centre is near an edge", () => {
    const nearCorner = { zoom: 2, centerX: 0, centerY: 1 };

    expect(cropRect(nearCorner, LANDSCAPE, SQUARE_VIEWPORT)).toEqual({
      x: 0,
      y: 0.5,
      width: 0.25,
      height: 0.5,
    });
  });
});

describe("framingAt", () => {
  const kenBurns: KenBurns = {
    from: { zoom: 1, centerX: 0.2, centerY: 0.5 },
    to: { zoom: 2, centerX: 0.6, centerY: 0.1 },
    easing: "linear",
  };

  it.each([
    [0, { zoom: 1, centerX: 0.2, centerY: 0.5 }],
    [0.5, { zoom: 1.5, centerX: 0.4, centerY: 0.3 }],
    [1, { zoom: 2, centerX: 0.6, centerY: 0.1 }],
  ])("interpolates from → to at progress %d", (progress, expected) => {
    const framing = framingAt(kenBurns, progress);

    expect(framing.zoom).toBeCloseTo(expected.zoom, 10);
    expect(framing.centerX).toBeCloseTo(expected.centerX, 10);
    expect(framing.centerY).toBeCloseTo(expected.centerY, 10);
  });

  it("applies the slide's easing", () => {
    const easedIn: KenBurns = { ...kenBurns, easing: "ease-in" };

    expect(framingAt(easedIn, 0.5).zoom).toBeCloseTo(1.125, 10);
  });
});
