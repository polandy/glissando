import { describe, expect, it } from "vitest";
import { FlacSampleQueue, SAMPLE_FORMAT, flacDepthOf } from "./flac-samples";

describe("flacDepthOf, the FLAC bit depth for a decoder's sample format", () => {
  it.each([
    ["32-bit integers, interleaved", SAMPLE_FORMAT.S32, 24],
    ["32-bit integers, planar", SAMPLE_FORMAT.S32P, 24],
    ["16-bit integers", SAMPLE_FORMAT.S16P, 16],
    ["floats from a lossy codec", SAMPLE_FORMAT.FLTP, 16],
    ["unsigned 8-bit", SAMPLE_FORMAT.U8, 16],
  ])("keeps %s at %i bits", (_name, format, depth) => {
    expect(flacDepthOf(format)).toBe(depth);
  });
});

describe("FlacSampleQueue, decoded audio as the FLAC encoder takes it", () => {
  it("interleaves planar floats into 16-bit samples, clamping what overshoots", () => {
    const queue = new FlacSampleQueue(16, 2, 3);
    queue.push({
      format: SAMPLE_FORMAT.FLTP,
      nbSamples: 3,
      data: [Float32Array.of(0, 0.5, 1.5), Float32Array.of(-1, -0.5, -2)],
    });

    expect(queue.takeFrames(true)).toEqual([
      Int16Array.of(0, -32767, 16384, -16384, 32767, -32767),
    ]);
  });

  it("passes 24-bit samples in 32-bit integers through unchanged", () => {
    const queue = new FlacSampleQueue(24, 2, 2);
    queue.push({
      format: SAMPLE_FORMAT.S32P,
      nbSamples: 2,
      data: [Int32Array.of(0x7fffff00, 256), Int32Array.of(-256, -0x80000000)],
    });

    expect(queue.takeFrames(true)).toEqual([Int32Array.of(0x7fffff00, -256, 256, -0x80000000)]);
  });

  it("keeps interleaved 16-bit samples and widens unsigned 8-bit ones", () => {
    const queue = new FlacSampleQueue(16, 1, 4);
    queue.push({ format: SAMPLE_FORMAT.S16, nbSamples: 2, data: Int16Array.of(-7, 7) });
    queue.push({ format: SAMPLE_FORMAT.U8, nbSamples: 2, data: Uint8Array.of(0, 128) });

    expect(queue.takeFrames(true)).toEqual([Int16Array.of(-7, 7, -32768, 0)]);
  });

  it("hands out whole frames and holds the rest back until the end", () => {
    const queue = new FlacSampleQueue(16, 1, 2);
    queue.push({ format: SAMPLE_FORMAT.S16, nbSamples: 5, data: Int16Array.of(1, 2, 3, 4, 5) });

    expect(queue.takeFrames(false)).toEqual([Int16Array.of(1, 2), Int16Array.of(3, 4)]);
    queue.push({ format: SAMPLE_FORMAT.S16, nbSamples: 2, data: Int16Array.of(6, 7) });
    expect(queue.takeFrames(false)).toEqual([Int16Array.of(5, 6)]);
    expect(queue.takeFrames(true)).toEqual([Int16Array.of(7)]);
    expect(queue.takeFrames(true)).toEqual([]);
  });

  it("refuses a frame whose channel count changed mid-track", () => {
    const queue = new FlacSampleQueue(16, 2, 4);

    expect(() =>
      queue.push({ format: SAMPLE_FORMAT.FLTP, nbSamples: 1, data: [Float32Array.of(0)] }),
    ).toThrow(/1 channel.*2/);
  });
});
