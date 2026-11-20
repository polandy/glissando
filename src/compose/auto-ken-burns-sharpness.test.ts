import { describe, expect, it } from "vitest";
import { SHARPNESS_FALL_EXPONENT, SOFT_ON_SCREEN_SHARPNESS } from "../focus/screen-sharpness";
import type { PictureFocus } from "../library/picture-focus";
import { framingAt } from "../player/ken-burns";
import { MIN_KEN_BURNS_ZOOM } from "../player/slideshow";
import {
  autoKenBurns,
  maxZoomForSharpness,
  SCENERY_ZOOM_TIGHT,
  SCENERY_ZOOM_WIDE,
  SMALLEST_ZOOM_TRAVEL,
} from "./auto-ken-burns";

const LANDSCAPE = { width: 400, height: 300 };
const SMALL_SUBJECT = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 };
const SWEEP_PROGRESS_SAMPLES = [0, 0.25, 0.5, 0.75, 1];

/** The sharpness that reaches the soft-on-screen floor exactly at `zoom`. */
function sharpnessSoftAt(zoom: number): number {
  return SOFT_ON_SCREEN_SHARPNESS * zoom ** SHARPNESS_FALL_EXPONENT;
}

function subject(sharpness?: number): PictureFocus {
  return {
    kind: "subject",
    box: SMALL_SUBJECT,
    foundBy: "face",
    ...(sharpness === undefined ? {} : { sharpness }),
  };
}

function largestZoom(index: number, focus: PictureFocus, strength?: number): number {
  const { from, to } = autoKenBurns(index, LANDSCAPE, focus, true, strength);
  return Math.max(from.zoom, to.zoom);
}

describe("maxZoomForSharpness, how far a picture may zoom before its softness shows", () => {
  // Zoom z divides the score by z to the fall exponent; the cap stops where it meets the floor.
  it.each([2, 3])("lets a picture zoom to %d where it reaches the soft-on-screen floor", (zoom) => {
    expect(maxZoomForSharpness(sharpnessSoftAt(zoom))).toBeCloseTo(zoom, 10);
  });

  it("zooms a softer picture less than a sharper one", () => {
    expect(maxZoomForSharpness(sharpnessSoftAt(1.1))).toBeLessThan(
      maxZoomForSharpness(sharpnessSoftAt(1.15)),
    );
  });

  it.each([0, SOFT_ON_SCREEN_SHARPNESS / 2, SOFT_ON_SCREEN_SHARPNESS])(
    "still moves a picture as soft as %d by the smallest zoom travel",
    (score) => {
      expect(maxZoomForSharpness(score)).toBe(SMALLEST_ZOOM_TRAVEL);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects a sharpness of %d", (score) => {
    expect(() => maxZoomForSharpness(score)).toThrow(RangeError);
  });
});

describe("autoKenBurns capped by the picture's sharpness", () => {
  it.each([0, 1])("zooms a soft subject only as far as it stays sharp, index %d", (index) => {
    expect(largestZoom(index, subject(sharpnessSoftAt(1.1)))).toBeCloseTo(1.1, 10);
  });

  it("zooms a sharp subject as far as an unmeasured one", () => {
    expect(largestZoom(0, subject(sharpnessSoftAt(3)))).toBe(largestZoom(0, subject()));
  });

  it("still moves a very soft picture by the smallest zoom travel", () => {
    const { from, to } = autoKenBurns(0, LANDSCAPE, subject(0));

    expect(from.zoom).toBe(MIN_KEN_BURNS_ZOOM);
    expect(to.zoom).toBe(SMALLEST_ZOOM_TRAVEL);
  });

  it("caps a picture with nothing to aim at by its whole sharpness", () => {
    const soft: PictureFocus = { kind: "none", sharpness: sharpnessSoftAt(1.1) };

    expect(largestZoom(0, soft)).toBeCloseTo(1.1, 10);
  });

  it("caps a stronger mood's motion too", () => {
    expect(largestZoom(0, subject(sharpnessSoftAt(1.1)), 2)).toBeCloseTo(1.1, 10);
  });

  it("caps both ends of a scenery sweep and keeps its frame inside the picture", () => {
    const cap = (SCENERY_ZOOM_WIDE + SCENERY_ZOOM_TIGHT) / 2;
    const scenery: PictureFocus = { kind: "scenery", sharpness: sharpnessSoftAt(cap) };
    for (const index of [0, 1]) {
      const motion = autoKenBurns(index, LANDSCAPE, scenery);

      expect(Math.max(motion.from.zoom, motion.to.zoom)).toBeCloseTo(cap, 10);
      expect(Math.min(motion.from.zoom, motion.to.zoom)).toBe(SCENERY_ZOOM_WIDE);
      for (const progress of SWEEP_PROGRESS_SAMPLES) {
        const framing = framingAt(motion, progress);
        const halfFrame = 0.5 / framing.zoom;
        expect(framing.centerX - halfFrame).toBeGreaterThanOrEqual(0);
        expect(framing.centerX + halfFrame).toBeLessThanOrEqual(1);
      }
    }
  });
});
