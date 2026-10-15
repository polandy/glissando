import { describe, expect, it } from "vitest";
import { VIDEO_DUCK_RAMP_DOWN_MS, VIDEO_DUCK_VOLUME, duckFactorAt } from "../player";
import { duckGainRamps } from "./duck-ramps";

const SPAN = { startMs: 10_000, endMs: 14_000 };

describe("duckGainRamps", () => {
  it("is full volume for a window far from every span", () => {
    expect(duckGainRamps([SPAN], 0, 5000)).toEqual([
      { atMs: 0, gain: 1, kind: "set" },
      { atMs: 5000, gain: 1, kind: "ramp" },
    ]);
  });

  it("ramps down before the span, holds, and ramps up after it", () => {
    expect(duckGainRamps([SPAN], 8000, 16_000)).toEqual([
      { atMs: 0, gain: 1, kind: "set" },
      { atMs: 1000, gain: 1, kind: "ramp" },
      { atMs: 2000, gain: VIDEO_DUCK_VOLUME, kind: "ramp" },
      { atMs: 6000, gain: VIDEO_DUCK_VOLUME, kind: "ramp" },
      { atMs: 7500, gain: 1, kind: "ramp" },
      { atMs: 8000, gain: 1, kind: "ramp" },
    ]);
  });

  it("starts a window inside a ramp at the factor there", () => {
    const [first] = duckGainRamps([SPAN], 10_000 - VIDEO_DUCK_RAMP_DOWN_MS / 2, 11_000);

    expect(first).toEqual({
      atMs: 0,
      gain: duckFactorAt(10_000 - VIDEO_DUCK_RAMP_DOWN_MS / 2, [SPAN]),
      kind: "set",
    });
  });

  it("stays ducked between two clips closer than a ramp up and a ramp down", () => {
    const next = { startMs: 14_500, endMs: 18_000 };
    const points = duckGainRamps([SPAN, next], 13_000, 15_500);

    expect(points.every((point) => point.gain === VIDEO_DUCK_VOLUME)).toBe(true);
  });

  it("reproduces duckFactorAt at every ramp point", () => {
    const spans = [SPAN, { startMs: 20_000, endMs: 22_000 }];
    for (const { atMs, gain } of duckGainRamps(spans, 8000, 25_000)) {
      expect(gain).toBeCloseTo(duckFactorAt(8000 + atMs, spans), 10);
    }
  });
});
