import { describe, expect, it } from "vitest";
import { cropAt, cropRect, framingAt, type Rect } from "./ken-burns";
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

describe("cropAt", () => {
  const SAMPLES = 1000;
  /** A smooth path changes its per-sample velocity by far less than this; an edge kink by more. */
  const MAX_VELOCITY_CHANGE = 1e-5;
  /** Starts against the picture's right and bottom edges and zooms in towards the centre. */
  const leavingTheEdge: KenBurns = {
    from: { zoom: 1, centerX: 0.95, centerY: 0.9 },
    to: { zoom: 1.5, centerX: 0.5, centerY: 0.5 },
    easing: "linear",
  };
  const path = (kenBurns: KenBurns): Rect[] =>
    Array.from({ length: SAMPLES + 1 }, (_, step) =>
      cropAt({ kenBurns, progress: step / SAMPLES }, LANDSCAPE, WIDE_VIEWPORT),
    );
  const differences = (values: number[]) =>
    values.slice(1).map((value, i) => value - (values[i] ?? Number.NaN));

  it("is held by the picture's edge for part of the way when the framings are interpolated", () => {
    const heldAtTheRight = (progress: number) => {
      const framing = framingAt(leavingTheEdge, progress);
      const crop = cropRect(framing, LANDSCAPE, WIDE_VIEWPORT);
      return framing.centerX + crop.width / 2 > 1;
    };

    expect([heldAtTheRight(0), heldAtTheRight(1)]).toEqual([true, false]);
  });

  it("starts and ends on the start and end frames as the picture's edges hold them", () => {
    const at = (progress: number) =>
      cropAt({ kenBurns: leavingTheEdge, progress }, LANDSCAPE, WIDE_VIEWPORT);
    const end = cropRect(leavingTheEdge.to, LANDSCAPE, WIDE_VIEWPORT);

    expect(at(0)).toEqual(cropRect(leavingTheEdge.from, LANDSCAPE, WIDE_VIEWPORT));
    expect(at(1).x).toBeCloseTo(end.x, 12);
    expect(at(1).y).toBeCloseTo(end.y, 12);
  });

  it.each(["x", "y"] as const)(
    "moves the crop's %s monotonically, without a kink where the picture's edge lets go",
    (axis) => {
      const positions = path(leavingTheEdge).map((crop) => crop[axis]);
      const velocities = differences(positions);
      const largestVelocityChange = Math.max(...differences(velocities).map(Math.abs));

      expect(velocities.every((velocity) => velocity >= 0)).toBe(true);
      expect(largestVelocityChange).toBeLessThan(MAX_VELOCITY_CHANGE);
    },
  );

  it("keeps the crop inside the picture all the way", () => {
    for (const crop of path(leavingTheEdge)) {
      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.width).toBeLessThanOrEqual(1 + 1e-12);
      expect(crop.y + crop.height).toBeLessThanOrEqual(1 + 1e-12);
    }
  });

  it("follows the interpolated framing exactly when no frame touches an edge", () => {
    const inside: KenBurns = {
      from: { zoom: 1.2, centerX: 0.45, centerY: 0.5 },
      to: { zoom: 2, centerX: 0.6, centerY: 0.4 },
      easing: "ease-in-out",
    };

    for (const progress of [0, 0.3, 0.5, 0.8, 1]) {
      const expected = cropRect(framingAt(inside, progress), LANDSCAPE, WIDE_VIEWPORT);
      const crop = cropAt({ kenBurns: inside, progress }, LANDSCAPE, WIDE_VIEWPORT);
      expect(crop.x).toBeCloseTo(expected.x, 12);
      expect(crop.y).toBeCloseTo(expected.y, 12);
    }
  });
});
