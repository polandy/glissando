import { describe, expect, it } from "vitest";
import { hexToRgb01 } from "./hex-color";

describe("hexToRgb01", () => {
  it("scales each channel from 0..255 to 0..1", () => {
    expect(hexToRgb01("#FF8000")).toEqual([1, 128 / 255, 0]);
  });

  it("reads black and white at the ends of the range", () => {
    expect(hexToRgb01("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb01("#FFFFFF")).toEqual([1, 1, 1]);
  });

  it("is case-insensitive, since the composer may send either case", () => {
    expect(hexToRgb01("#abcdef")).toEqual(hexToRgb01("#ABCDEF"));
  });
});
