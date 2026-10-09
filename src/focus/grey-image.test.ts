import { describe, expect, it } from "vitest";
import { greyFromRgba } from "./grey-image";

const OPAQUE = 255;

describe("greyFromRgba", () => {
  it.each([
    { colour: "black", rgb: [0, 0, 0], grey: 0 },
    { colour: "white", rgb: [255, 255, 255], grey: 255 },
    { colour: "red", rgb: [255, 0, 0], grey: 51 },
    { colour: "green", rgb: [0, 255, 0], grey: 178 },
    { colour: "blue", rgb: [0, 0, 255], grey: 25 },
  ])("weighs $colour as pico's (2R + 7G + B) / 10, rounded down", ({ rgb, grey }) => {
    const rgba = new Uint8ClampedArray([...rgb, OPAQUE]);

    expect(greyFromRgba(rgba, 1, 1).pixels).toEqual(new Uint8Array([grey]));
  });

  it("keeps the size and the row-major pixel order, ignoring alpha", () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 0, 255, 255, 255, 0, 255, 0, 0, 255]);

    const image = greyFromRgba(rgba, 3, 1);

    expect(image).toEqual({ width: 3, height: 1, pixels: new Uint8Array([0, 255, 51]) });
  });

  it("rejects RGBA data whose length does not match the size", () => {
    const rgba = new Uint8ClampedArray(4 * 3);

    expect(() => greyFromRgba(rgba, 2, 2)).toThrow(RangeError);
  });
});
