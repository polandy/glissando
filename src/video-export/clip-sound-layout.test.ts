import { describe, expect, it } from "vitest";
import { assembledSoundLength, placeChunkFrames } from "./clip-sound-layout";

const SAMPLE_RATE = 48_000;

describe("placeChunkFrames", () => {
  it.each([
    ["at file time 0, copies the whole chunk from its own start", 0, 480, 0, 0, 480],
    ["mid-file, offsets the target by the rounded timestamp", 0.1, 480, 4800, 0, 480],
    ["a timestamp that rounds up lands one frame later", 0.1 + 1 / SAMPLE_RATE, 480, 4801, 0, 480],
    ["negative timestamp cuts its early frames, landing the rest at time 0", -0.1, 480, 0, 4800, 0],
    ["a chunk that ends before time 0 contributes no frames", -1, 480, 0, 48_000, 0],
  ] as const)(
    "%s",
    (
      _description,
      timestampSeconds,
      frameCount,
      targetFrameOffset,
      sourceFrameOffset,
      framesToCopy,
    ) => {
      expect(placeChunkFrames({ timestampSeconds, frameCount }, SAMPLE_RATE)).toEqual({
        targetFrameOffset,
        sourceFrameOffset,
        framesToCopy,
      });
    },
  );
});

describe("assembledSoundLength", () => {
  it("spans from file time 0 to the last chunk's end", () => {
    expect(assembledSoundLength({ timestampSeconds: 2, frameCount: 480 }, SAMPLE_RATE)).toBe(
      2 * SAMPLE_RATE + 480,
    );
  });

  it("is cut to the part of the last chunk at or after time 0", () => {
    expect(assembledSoundLength({ timestampSeconds: -0.1, frameCount: 4800 }, SAMPLE_RATE)).toBe(0);
  });

  it("is never negative, even when the last chunk ends before time 0", () => {
    expect(assembledSoundLength({ timestampSeconds: -1, frameCount: 480 }, SAMPLE_RATE)).toBe(0);
  });
});
