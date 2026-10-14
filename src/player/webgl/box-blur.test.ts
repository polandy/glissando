import { describe, expect, it } from "vitest";
import { gaussianBlur, type PixelBuffer } from "./box-blur";

/** A single opaque white pixel at `x`, transparent black everywhere else, one row tall. */
function spike(width: number, x: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * 4);
  const index = x * 4;
  data[index] = 255;
  data[index + 1] = 255;
  data[index + 2] = 255;
  data[index + 3] = 255;
  return { data, width, height: 1 };
}

function alphaAt(pixels: PixelBuffer, x: number): number {
  return pixels.data[x * 4 + 3] ?? 0;
}

function totalAlpha(pixels: PixelBuffer): number {
  let total = 0;
  for (let x = 0; x < pixels.width; x++) {
    total += alphaAt(pixels, x);
  }
  return total;
}

describe("gaussianBlur", () => {
  it("spreads a single opaque pixel's edge into its fully transparent neighbours", () => {
    const sharp = spike(9, 4);

    const blurred = gaussianBlur(sharp, 1.5);

    expect(alphaAt(sharp, 3)).toBe(0);
    expect(alphaAt(sharp, 5)).toBe(0);
    expect(alphaAt(blurred, 3)).toBeGreaterThan(0);
    expect(alphaAt(blurred, 5)).toBeGreaterThan(0);
    expect(alphaAt(blurred, 4)).toBeLessThan(255);
  });

  it("conserves alpha's total within rounding, away from the buffer's edge", () => {
    const sharp = spike(21, 10);

    const blurred = gaussianBlur(sharp, 2);

    const before = totalAlpha(sharp);
    const after = totalAlpha(blurred);
    expect(Math.abs(after - before)).toBeLessThanOrEqual(3);
  });

  it("does not modify its input", () => {
    const sharp = spike(9, 4);
    const before = Uint8ClampedArray.from(sharp.data);

    gaussianBlur(sharp, 1.5);

    expect(sharp.data).toEqual(before);
  });

  it("leaves the buffer unchanged at sigma 0", () => {
    const sharp = spike(9, 4);

    const blurred = gaussianBlur(sharp, 0);

    expect(Array.from(blurred.data)).toEqual(Array.from(sharp.data));
  });
});
