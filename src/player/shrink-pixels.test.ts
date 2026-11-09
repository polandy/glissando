import { describe, expect, it } from "vitest";
import type { RgbaPixels } from "./backdrop-blur";
import { shrinkPixels } from "./shrink-pixels";

const CHANNELS = 4;
const OPAQUE = 255;

function picture(
  width: number,
  height: number,
  colour: (x: number, y: number) => readonly [number, number, number],
): RgbaPixels {
  const data = new Uint8ClampedArray(width * height * CHANNELS);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data.set([...colour(x, y), OPAQUE], (y * width + x) * CHANNELS);
    }
  }
  return { width, height, data };
}

function pixelAt({ width, data }: RgbaPixels, x: number, y: number): number[] {
  const offset = (y * width + x) * CHANNELS;
  return [...data.subarray(offset, offset + CHANNELS)];
}

describe("shrinkPixels", () => {
  it("shrinks to the size asked for, each half keeping its own colour", () => {
    const halves = picture(400, 200, (x) => (x < 200 ? [255, 0, 0] : [0, 0, 255]));

    const shrunk = shrinkPixels(halves, 4, 2);

    expect({ width: shrunk.width, height: shrunk.height }).toEqual({ width: 4, height: 2 });
    expect(shrunk.data).toHaveLength(4 * 2 * CHANNELS);
    expect(pixelAt(shrunk, 0, 1)).toEqual([255, 0, 0, OPAQUE]);
    expect(pixelAt(shrunk, 3, 0)).toEqual([0, 0, 255, OPAQUE]);
  });

  it("averages fine detail within each cell instead of picking one pixel of it", () => {
    const stripes = picture(64, 64, (x) => (x % 16 < 8 ? [0, 0, 0] : [200, 200, 200]));

    const shrunk = shrinkPixels(stripes, 2, 2);

    expect(pixelAt(shrunk, 1, 1)).toEqual([100, 100, 100, OPAQUE]);
  });
});
