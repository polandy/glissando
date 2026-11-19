import { describe, expect, it } from "vitest";
import { blurred, checkerboard, greyImage } from "../culling/testing/grey-scenes";
import { sharpness } from "../culling/sharpness";
import { SMALLEST_ZOOM_TRAVEL } from "./auto-ken-burns";
import { maxZoomForSharpness, subjectSharpness } from "./sharpness-zoom-cap";

const WHOLE_PICTURE = { x: 0, y: 0, width: 1, height: 1 };
const LEFT_HALF = { x: 0, y: 0, width: 0.5, height: 1 };
const RIGHT_HALF = { x: 0.5, y: 0, width: 0.5, height: 1 };

const SHARP_HALF = checkerboard(32, 48, 8);
const SOFT_HALF = blurred(SHARP_HALF, 4);

/** `SHARP_HALF` on the left, `SOFT_HALF` beside it on the right. */
function sharpLeftSoftRight() {
  return greyImage(64, 48, (x, y) =>
    x < 32 ? (SHARP_HALF.pixels[y * 32 + x] ?? 0) : (SOFT_HALF.pixels[y * 32 + x - 32] ?? 0),
  );
}

describe("subjectSharpness, the sharpness inside the subject's box", () => {
  it("over the whole picture is the picture's sharpness", () => {
    const picture = sharpLeftSoftRight();

    expect(subjectSharpness(picture, WHOLE_PICTURE)).toBe(sharpness(picture));
  });

  it("measures only the pixels inside the box", () => {
    expect(subjectSharpness(sharpLeftSoftRight(), RIGHT_HALF)).toBe(sharpness(SOFT_HALF));
  });

  it("is higher on a sharp subject than on a soft one in the same picture", () => {
    const picture = sharpLeftSoftRight();

    expect(subjectSharpness(picture, LEFT_HALF)).toBeGreaterThan(
      subjectSharpness(picture, RIGHT_HALF),
    );
  });

  it("is zero for a box too small to hold an inner pixel", () => {
    const tiny = { x: 0.5, y: 0.5, width: 0.01, height: 0.01 };

    expect(subjectSharpness(checkerboard(64, 48, 1), tiny)).toBe(0);
  });
});

describe("maxZoomForSharpness, how far a picture may zoom before its softness shows", () => {
  // Zoom z magnifies the Laplacian's variance down by z⁴; the cap keeps it at the blurry floor (50).
  it.each([
    [800, 2],
    [4050, 3],
  ])("lets sharpness %d zoom to %d, where it reaches the blurry floor", (score, zoom) => {
    expect(maxZoomForSharpness(score)).toBeCloseTo(zoom, 10);
  });

  it("zooms a softer picture less than a sharper one", () => {
    expect(maxZoomForSharpness(100)).toBeLessThan(maxZoomForSharpness(200));
  });

  it.each([0, 10, 50])(
    "still moves a picture as soft as %d by the smallest zoom travel",
    (score) => {
      expect(maxZoomForSharpness(score)).toBe(SMALLEST_ZOOM_TRAVEL);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects a sharpness of %d", (score) => {
    expect(() => maxZoomForSharpness(score)).toThrow(RangeError);
  });
});
