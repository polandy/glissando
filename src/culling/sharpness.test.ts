import { describe, expect, it } from "vitest";
import { sharpness } from "./sharpness";
import { blurred, checkerboard, greyImage } from "./testing/grey-scenes";

describe("sharpness, the variance of the Laplacian", () => {
  it("is zero for a flat picture", () => {
    expect(sharpness(greyImage(40, 30, () => 128))).toBe(0);
  });

  it("is zero for a smooth ramp, which has no edges", () => {
    expect(sharpness(greyImage(40, 30, (x) => x * 4))).toBe(0);
  });

  it("falls as the same scene is blurred more", () => {
    const scene = checkerboard(64, 48, 8);
    const once = blurred(scene, 1);
    const often = blurred(scene, 4);

    expect(sharpness(scene)).toBeGreaterThan(sharpness(once));
    expect(sharpness(once)).toBeGreaterThan(sharpness(often));
  });

  it("is zero for a picture too small to have an inner pixel", () => {
    expect(sharpness(greyImage(2, 2, (x) => x * 255))).toBe(0);
  });
});
