import { describe, expect, it } from "vitest";
import { loudestStretchStartMs } from "./loudest-stretch";
import { LOUDNESS_HOP_MS, measureLoudness } from "./measure-loudness";
import { concatSegments, sineTone } from "./testing/synthetic-tones";

describe("loudestStretchStartMs", () => {
  it("finds a loud burst inside an otherwise quiet signal", () => {
    const sampleRate = 48_000;
    const quiet = sineTone(1000, 0.01, 10_000, sampleRate);
    const burst = sineTone(1000, 1.0, 8000, sampleRate);
    const track = concatSegments(quiet, burst, quiet);
    const loudness = measureLoudness([track], sampleRate);

    const start = loudestStretchStartMs(loudness, 0, 28_000, 8000);

    expect(Math.abs(start - 10_000)).toBeLessThanOrEqual(LOUDNESS_HOP_MS);
  });

  it("returns the excerpt's own start when it is shorter than the requested length", () => {
    const sampleRate = 48_000;
    const loudness = measureLoudness([sineTone(1000, 1.0, 3000, sampleRate)], sampleRate);

    expect(loudestStretchStartMs(loudness, 500, 2000, 5000)).toBe(500);
  });
});
