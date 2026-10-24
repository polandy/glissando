import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import { MIN_KEN_BURNS_ZOOM } from "../player/slideshow";
import {
  autoKenBurns,
  DEFAULT_KEN_BURNS_STRENGTH,
  SCENERY_ZOOM_TIGHT,
  SCENERY_ZOOM_WIDE,
} from "./auto-ken-burns";

const PICTURE = { width: 1000, height: 800 };

const SCENERY: PictureFocus = { kind: "scenery" };

describe("autoKenBurns strength", () => {
  it("defaults to a strength of 1, today's unscaled motion", () => {
    expect(DEFAULT_KEN_BURNS_STRENGTH).toBe(1);
    expect(autoKenBurns(0, PICTURE, undefined, true, 1)).toEqual(autoKenBurns(0, PICTURE));
  });

  it("scales the largest zoom toward 1 by the strength", () => {
    const gentle = autoKenBurns(0, PICTURE, undefined, true, 0.5);
    const strong = autoKenBurns(0, PICTURE, undefined, true, 1.4);

    // Index 0 zooms in: `to.zoom` is the largest zoom shown.
    expect(gentle.to.zoom).toBeCloseTo(1 + 0.2 * 0.5, 10);
    expect(strong.to.zoom).toBeCloseTo(1 + 0.2 * 1.4, 10);
  });

  it("never lowers the largest zoom below MIN_KEN_BURNS_ZOOM's own picture coverage", () => {
    const gentle = autoKenBurns(0, PICTURE, undefined, true, 0.5);
    expect(gentle.to.zoom).toBeGreaterThan(MIN_KEN_BURNS_ZOOM);
  });

  it("scales the pan swing by the strength", () => {
    const unscaled = autoKenBurns(0, PICTURE, undefined, true, 1);
    const gentle = autoKenBurns(0, PICTURE, undefined, true, 0.5);

    const unscaledSwing = unscaled.to.centerX - unscaled.from.centerX;
    const gentleSwing = gentle.to.centerX - gentle.from.centerX;
    expect(gentleSwing).toBeCloseTo(unscaledSwing * 0.5, 10);
  });

  it("scales the scenery sweep's zooms by the strength", () => {
    const strong = autoKenBurns(0, PICTURE, SCENERY, true, 1.4);

    expect(strong.from.zoom).toBeCloseTo(1 + (SCENERY_ZOOM_WIDE - 1) * 1.4, 10);
    expect(strong.to.zoom).toBeCloseTo(1 + (SCENERY_ZOOM_TIGHT - 1) * 1.4, 10);
  });
});
