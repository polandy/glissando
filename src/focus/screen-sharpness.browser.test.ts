import { describe, expect, it } from "vitest";
import { maxZoomForSharpness, SCENERY_ZOOM_WIDE } from "../compose/auto-ken-burns";
import { sceneDisplay } from "../culling/testing/generated-scenes";
import type { PictureFocus } from "../library/picture-focus";
import { SHARPNESS_FALL_EXPONENT, screenSharpness } from "./screen-sharpness";

// Generated scenes (no photo involved), stored as the import stores a display rendition. Drawn
// 2880 px wide they show at 1920 px on screen: softness 1.5 is sharp on screen, 3 is as soft as
// that picture zoomed twofold.
const DISPLAY_WIDTH = 2880;
const SHARP_ON_SCREEN = 1.5;
const SOFT_BY_TWO = 3;
const HUES = [0, 60, 120, 200, 280];
const NOTHING: PictureFocus = { kind: "none" };
const FIGURE: PictureFocus = {
  kind: "subject",
  box: { x: 66 / 160, y: 46 / 120, width: 16 / 160, height: 46 / 120 },
  foundBy: "object",
};
/** The fall exponent each scene shows lies within this much of `SHARPNESS_FALL_EXPONENT`. */
const FALL_EXPONENT_TOLERANCE = 0.5;
/** The zoom a picture sharp on screen may take at least: the automatic subject zoom. */
const SUBJECT_ZOOM = 1.2;

function measured(hue: number, softness: number, focus: PictureFocus): Promise<number> {
  return sceneDisplay({ hue, softness, width: DISPLAY_WIDTH }).then((display) =>
    screenSharpness(display, focus),
  );
}

describe("the sharpness on screen, calibrated on generated scenes (ADR-0061)", () => {
  it.each(HUES)("falls with zoom by about the fall exponent, scene of hue %d", async (hue) => {
    const sharp = await measured(hue, SHARP_ON_SCREEN, NOTHING);
    const soft = await measured(hue, SOFT_BY_TWO, NOTHING);

    expect(Math.abs(Math.log2(sharp / soft) - SHARPNESS_FALL_EXPONENT)).toBeLessThan(
      FALL_EXPONENT_TOLERANCE,
    );
  });

  it.each(HUES)("lets a scene sharp on screen zoom fully, hue %d", async (hue) => {
    expect(maxZoomForSharpness(await measured(hue, SHARP_ON_SCREEN, NOTHING))).toBeGreaterThan(
      SUBJECT_ZOOM,
    );
  });

  it.each(HUES)("holds a scene soft by two to a scenery sweep's wide end, hue %d", async (hue) => {
    expect(maxZoomForSharpness(await measured(hue, SOFT_BY_TWO, NOTHING))).toBeLessThan(
      SCENERY_ZOOM_WIDE,
    );
  });

  it.each(HUES)("zooms a soft subject less than the same subject sharp, hue %d", async (hue) => {
    const sharp = maxZoomForSharpness(await measured(hue, SHARP_ON_SCREEN, FIGURE));
    const soft = maxZoomForSharpness(await measured(hue, SOFT_BY_TWO, FIGURE));

    expect(sharp).toBeGreaterThan(SUBJECT_ZOOM);
    expect(soft).toBeLessThan(sharp);
  });
});
