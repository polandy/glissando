import { describe, expect, it } from "vitest";
import { blurBackdrop, type RgbaPixels } from "./backdrop-blur";

const SIZE = 96;
const CHANNELS = 4;
const OPAQUE = 255;
/** A bright square in a dark picture: large enough that its blurred values stay well above 0. */
const SQUARE = 8;
/** 8-bit rounding of each blurred value moves the total by at most half a step per value. */
const ROUNDING_PER_VALUE = 0.5;

function picture(
  width: number,
  height: number,
  brightness: (x: number, y: number) => number,
): RgbaPixels {
  const data = new Uint8ClampedArray(width * height * CHANNELS);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * CHANNELS;
      data.fill(brightness(x, y), offset, offset + CHANNELS - 1);
      data[offset + CHANNELS - 1] = OPAQUE;
    }
  }
  return { width, height, data };
}

function centredSquare(x: number, y: number): number {
  const start = (SIZE - SQUARE) / 2;
  const inside = (value: number) => value >= start && value < start + SQUARE;
  return inside(x) && inside(y) ? OPAQUE : 0;
}

function red({ width, data }: RgbaPixels, x: number, y: number): number {
  return data[(y * width + x) * CHANNELS] ?? Number.NaN;
}

function redTotal({ data }: RgbaPixels): number {
  return data.filter((_, index) => index % CHANNELS === 0).reduce((sum, value) => sum + value, 0);
}

describe("blurBackdrop", () => {
  it("keeps the picture's size and its total brightness away from the edges", () => {
    const original = picture(SIZE, SIZE, centredSquare);

    const blurred = blurBackdrop(original);

    expect([blurred.width, blurred.height]).toEqual([SIZE, SIZE]);
    expect(Math.abs(redTotal(blurred) - redTotal(original))).toBeLessThanOrEqual(
      SIZE * SIZE * ROUNDING_PER_VALUE,
    );
  });

  it("spreads a bright square into a single soft hill that falls off steadily, without rings", () => {
    const blurred = blurBackdrop(picture(SIZE, SIZE, centredSquare));
    const row = Array.from({ length: SIZE }, (_, x) => red(blurred, x, SIZE / 2));
    const peak = row.indexOf(Math.max(...row));

    const rightSide = row.slice(peak);
    const leftSide = row.slice(0, peak + 1).reverse();

    expect(row[peak]).toBeGreaterThan(0);
    expect(row[peak]).toBeLessThan(OPAQUE);
    expect(row[0]).toBeLessThan(row[peak] ?? 0);
    for (const side of [leftSide, rightSide]) {
      side.slice(1).forEach((value, index) => {
        expect(value).toBeLessThanOrEqual(side[index] ?? 0);
      });
    }
  });

  it("treats the picture as continuing its edge colour beyond the edge, so the edges do not darken", () => {
    const brightLeftHalf = picture(SIZE, SIZE, (x) => (x < SIZE / 2 ? OPAQUE : 0));

    const blurred = blurBackdrop(brightLeftHalf);

    expect(red(blurred, 0, 0)).toBe(OPAQUE);
    expect(red(blurred, 0, SIZE - 1)).toBe(OPAQUE);
    expect(red(blurred, SIZE - 1, SIZE / 2)).toBe(0);
    expect(red(blurred, SIZE / 2, SIZE / 2)).toBeLessThan(OPAQUE);
  });

  it("leaves an opaque picture opaque", () => {
    const blurred = blurBackdrop(picture(SIZE, SIZE, centredSquare));

    expect(blurred.data.filter((_, index) => index % CHANNELS === CHANNELS - 1)).toEqual(
      new Uint8ClampedArray(SIZE * SIZE).fill(OPAQUE),
    );
  });
});
