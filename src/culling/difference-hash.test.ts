import { describe, expect, it } from "vitest";
import { differenceHash, hashDistance } from "./difference-hash";
import { bars, blurred, checkerboard, greyImage } from "./testing/grey-scenes";

describe("the 64-bit difference hash", () => {
  it("is the same for the same scene", () => {
    const scene = bars(480, 360);

    expect(hashDistance(differenceHash(scene), differenceHash(bars(480, 360)))).toBe(0);
  });

  it("barely moves for the same scene a little blurred or shifted", () => {
    const scene = checkerboard(480, 360, 60);

    expect(
      hashDistance(differenceHash(scene), differenceHash(blurred(scene, 2))),
    ).toBeLessThanOrEqual(4);
    expect(
      hashDistance(differenceHash(scene), differenceHash(checkerboard(480, 360, 60, 6))),
    ).toBeLessThanOrEqual(10);
  });

  it("differs widely between different scenes", () => {
    expect(
      hashDistance(differenceHash(checkerboard(480, 360, 60)), differenceHash(bars(480, 360))),
    ).toBeGreaterThan(20);
  });

  it("sets a bit where the left of two neighbouring cells is brighter", () => {
    const brightLeft = greyImage(9, 8, (x) => 255 - x * 20);
    const brightRight = greyImage(9, 8, (x) => x * 20);

    expect(differenceHash(brightLeft)).toBe(0xffff_ffff_ffff_ffffn);
    expect(differenceHash(brightRight)).toBe(0n);
  });

  it("counts the bits two hashes differ in", () => {
    expect(hashDistance(0b1011n, 0b0001n)).toBe(2);
    expect(hashDistance(0n, 0xffff_ffff_ffff_ffffn)).toBe(64);
  });
});
