import { describe, expect, it } from "vitest";
import { excerptPeakDbfs } from "./excerpt-peak";
import { measureLoudness } from "./measure-loudness";
import { concatSegments, sineTone } from "./testing/synthetic-tones";

describe("excerptPeakDbfs", () => {
  it("only sees the hops inside the excerpt", () => {
    const sampleRate = 48_000;
    const quiet = sineTone(1000, 0.1, 5000, sampleRate);
    const loud = sineTone(1000, 1.0, 5000, sampleRate);
    const loudness = measureLoudness([concatSegments(quiet, loud)], sampleRate);

    expect(excerptPeakDbfs(loudness, 0, 5000)).toBeCloseTo(20 * Math.log10(0.1), 1);
    expect(excerptPeakDbfs(loudness, 5000, 10_000)).toBeCloseTo(0, 1);
  });

  it("returns null for a silent excerpt", () => {
    const sampleRate = 48_000;
    const loudness = measureLoudness([new Float32Array(sampleRate)], sampleRate);

    expect(excerptPeakDbfs(loudness, 0, 1000)).toBeNull();
  });
});
