import { describe, expect, it } from "vitest";
import type { RgbaImage } from "./object-focus";
import { sceneryFocus } from "./scenery-focus";

type Rgb = readonly [number, number, number];

const SKY_BLUE: Rgb = [90, 140, 220];
const OVERCAST: Rgb = [200, 200, 205];
const DARK_WALL: Rgb = [70, 60, 50];
const GROUND_LIGHT: Rgb = [90, 140, 60];
const GROUND_DARK: Rgb = [30, 60, 20];

/** The upper half is `sky`, flat; the lower half a checkerboard of two colours, flat when equal. */
function skyOverGround(
  width: number,
  height: number,
  sky: Rgb | readonly [Rgb, Rgb],
  groundA: Rgb,
  groundB: Rgb,
): RgbaImage {
  const skyRows = Math.floor(height / 2);
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const even = (row + column) % 2 === 0;
      const colour =
        row < skyRows ? (isPair(sky) ? (even ? sky[0] : sky[1]) : sky) : even ? groundA : groundB;
      data.set(colour, (row * width + column) * 4);
    }
  }
  return { width, height, data };
}

function isPair(colour: Rgb | readonly [Rgb, Rgb]): colour is readonly [Rgb, Rgb] {
  return Array.isArray(colour[0]);
}

describe("sceneryFocus", () => {
  it("recognises a blue sky over a textured ground in a wide picture", () => {
    expect(sceneryFocus(skyOverGround(120, 80, SKY_BLUE, GROUND_LIGHT, GROUND_DARK))).toEqual({
      kind: "scenery",
    });
  });

  it("recognises an overcast sky, which is bright rather than blue", () => {
    expect(sceneryFocus(skyOverGround(120, 80, OVERCAST, GROUND_LIGHT, GROUND_DARK))).toEqual({
      kind: "scenery",
    });
  });

  it("finds no scenery in a portrait picture, which has no width to sweep", () => {
    expect(sceneryFocus(skyOverGround(80, 120, SKY_BLUE, GROUND_LIGHT, GROUND_DARK))).toEqual({
      kind: "none",
    });
  });

  it("finds no scenery when the upper part is as busy as the lower part", () => {
    const busy = skyOverGround(120, 80, [SKY_BLUE, DARK_WALL], GROUND_LIGHT, GROUND_DARK);

    expect(sceneryFocus(busy)).toEqual({ kind: "none" });
  });

  it("finds no scenery in a dark, flat upper part that is neither blue nor bright", () => {
    expect(sceneryFocus(skyOverGround(120, 80, DARK_WALL, GROUND_LIGHT, GROUND_DARK))).toEqual({
      kind: "none",
    });
  });

  it("finds no scenery when the lower part is as flat as the sky", () => {
    expect(sceneryFocus(skyOverGround(120, 80, SKY_BLUE, GROUND_LIGHT, GROUND_LIGHT))).toEqual({
      kind: "none",
    });
  });
});
