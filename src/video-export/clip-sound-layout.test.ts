import { describe, expect, it } from "vitest";
import { placeChunkFrames, soundLengthFrames } from "./clip-sound-layout";

const SAMPLE_RATE = 48_000;
const ROOMY = 10 * SAMPLE_RATE;

describe("placeChunkFrames", () => {
  it.each([
    ["at file time 0, copies the whole chunk from its own start", 0, 480, 0, 0, 480],
    ["mid-file, offsets the target by the rounded timestamp", 0.1, 480, 4800, 0, 480],
    ["a timestamp that rounds up lands one frame later", 0.1 + 1 / SAMPLE_RATE, 480, 4801, 0, 480],
    ["negative timestamp cuts its early frames, landing the rest at time 0", -0.1, 480, 0, 4800, 0],
    ["a chunk that ends before time 0 contributes no frames", -1, 480, 0, 48_000, 0],
    ["a chunk running past the buffer's end is cut at it", 10 - 0.005, 480, ROOMY - 240, 0, 240],
    ["a chunk starting past the buffer's end contributes no frames", 11, 480, ROOMY, 0, 0],
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
      expect(placeChunkFrames({ timestampSeconds, frameCount }, SAMPLE_RATE, ROOMY)).toEqual({
        targetFrameOffset,
        sourceFrameOffset,
        framesToCopy,
      });
    },
  );
});

describe("soundLengthFrames", () => {
  it("holds the whole duration, rounded up to a whole frame", () => {
    expect(soundLengthFrames(2 + 0.5 / SAMPLE_RATE, SAMPLE_RATE)).toBe(2 * SAMPLE_RATE + 1);
  });

  it("is 0 for a track without duration", () => {
    expect(soundLengthFrames(0, SAMPLE_RATE)).toBe(0);
  });
});
