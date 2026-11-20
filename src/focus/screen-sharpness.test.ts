import { describe, expect, it } from "vitest";
import { blurred, checkerboard, greyImage } from "../culling/testing/grey-scenes";
import { sharpness } from "../culling/sharpness";
import { screenSize, subjectSharpness } from "./screen-sharpness";

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
describe("screenSize, a picture as large as it fills a Full HD screen at zoom 1", () => {
  it.each([
    [
      { width: 3840, height: 2160 },
      { width: 1920, height: 1080 },
    ],
    [
      { width: 2880, height: 2160 },
      { width: 1920, height: 1440 },
    ],
    [
      { width: 1080, height: 1920 },
      { width: 1080, height: 1920 },
    ],
    [
      { width: 960, height: 540 },
      { width: 1920, height: 1080 },
    ],
  ])("draws %o at %o", (picture, onScreen) => {
    expect(screenSize(picture)).toEqual(onScreen);
  });
});
