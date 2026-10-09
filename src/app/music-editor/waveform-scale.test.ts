import { describe, expect, it } from "vitest";
import { barCountFor, rulerTicksMs } from "./waveform-scale";

describe("rulerTicksMs", () => {
  it("labels a 3:24 track every 30 s on a wide waveform, and its end", () => {
    expect(rulerTicksMs(204_000, 800)).toEqual([
      0, 30_000, 60_000, 90_000, 120_000, 150_000, 180_000, 204_000,
    ]);
  });

  it("labels it every minute on a phone, leaving out a label too close to the end", () => {
    expect(rulerTicksMs(204_000, 330)).toEqual([0, 60_000, 120_000, 204_000]);
  });

  it("leaves out a tick too close to the end label", () => {
    expect(rulerTicksMs(185_000, 600)).toEqual([
      0, 30_000, 60_000, 90_000, 120_000, 150_000, 185_000,
    ]);
  });
});

describe("barCountFor", () => {
  it("draws a bar every 5 px, between 40 and 200 bars", () => {
    expect(barCountFor(500)).toBe(100);
    expect(barCountFor(100)).toBe(40);
    expect(barCountFor(2000)).toBe(200);
  });
});
