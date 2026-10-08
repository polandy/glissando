import { describe, expect, it } from "vitest";
import { DISPLAY_BOUND, fitWithin, THUMBNAIL_BOUND } from "./downscale";

describe("fitWithin", () => {
  it.each([
    { picture: "a 3:2 landscape", size: [6000, 4000], fitted: [3240, 2160] },
    { picture: "a 2:3 portrait", size: [4000, 6000], fitted: [2160, 3240] },
    { picture: "a 16:9 frame", size: [7680, 4320], fitted: [3840, 2160] },
    { picture: "a panorama", size: [12000, 3000], fitted: [3840, 960] },
    { picture: "a square", size: [5000, 5000], fitted: [2160, 2160] },
    { picture: "a small picture, never upscaled", size: [800, 600], fitted: [800, 600] },
    { picture: "a picture exactly at the bound", size: [3840, 2160], fitted: [3840, 2160] },
    { picture: "an odd size, to whole pixels", size: [4001, 3001], fitted: [2880, 2160] },
  ])("fits $picture within the display bound", ({ size, fitted }) => {
    const [width, height] = size as [number, number];

    expect(fitWithin({ width, height }, DISPLAY_BOUND)).toEqual({
      width: fitted[0],
      height: fitted[1],
    });
  });

  it.each([
    { picture: "a 3:2 landscape", size: [6000, 4000], fitted: [480, 320] },
    { picture: "a 2:3 portrait", size: [4000, 6000], fitted: [320, 480] },
    { picture: "a sliver, keeping at least one pixel", size: [10000, 3], fitted: [480, 1] },
    { picture: "a small picture, never upscaled", size: [300, 200], fitted: [300, 200] },
  ])("fits $picture within the thumbnail bound", ({ size, fitted }) => {
    const [width, height] = size as [number, number];

    expect(fitWithin({ width, height }, THUMBNAIL_BOUND)).toEqual({
      width: fitted[0],
      height: fitted[1],
    });
  });
});
