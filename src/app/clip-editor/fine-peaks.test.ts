import { describe, expect, it } from "vitest";
import { FINE_PEAK_COUNT } from "../music-editor/decode-peaks";
import { FinePeaks } from "./fine-peaks";

/** 1000 slices of exactly 1 s each, so a slice index equals a whole second. */
const SOURCE_MS = FINE_PEAK_COUNT * 1000;

describe("FinePeaks", () => {
  it("is all zero before anything is added", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    expect(peaks.snapshot()).toEqual(new Float32Array(FINE_PEAK_COUNT));
  });

  it("takes the loudest absolute sample of a slice from one channel", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    peaks.add(0, 4, [Float32Array.from([0.1, -0.5, 0.2, 0.3])]);

    expect(peaks.snapshot()[0]).toBeCloseTo(0.5);
  });

  it("takes the loudest absolute sample across channels", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    peaks.add(1, 4, [Float32Array.from([0.1, 0.1, 0.1, 0.1]), Float32Array.from([0.9, 0, 0, 0])]);

    expect(peaks.snapshot()[1]).toBeCloseTo(0.9);
  });

  it("keeps the loudest sample seen across repeated adds to the same slice", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    peaks.add(0, 4, [Float32Array.from([0.2, 0.2, 0.2, 0.2])]);
    peaks.add(0, 4, [Float32Array.from([0.1, 0.1, 0.1, 0.1])]);

    expect(peaks.snapshot()[0]).toBeCloseTo(0.2);
  });

  it("splits one buffer across the slices it spans", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    // 8 samples at 4 Hz span 2 s: slice 0 at value 0.3, slice 1 at value 0.7.
    peaks.add(0, 4, [Float32Array.from([0.3, 0.1, 0.2, 0.1, 0.1, 0.7, 0.2, 0.1])]);

    const snapshot = peaks.snapshot();
    expect(snapshot[0]).toBeCloseTo(0.3);
    expect(snapshot[1]).toBeCloseTo(0.7);
  });

  it("ignores the part of a buffer before the clip's start, never crashing", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    // Samples at -0.5 s and -0.25 s are before 0 and must not count; 0 s and 0.25 s do.
    peaks.add(-0.5, 4, [Float32Array.from([0.9, 0.9, 0.4, 0.4])]);

    expect(peaks.snapshot()[0]).toBeCloseTo(0.4);
  });

  it("ignores a buffer entirely before the clip's start, never crashing", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    peaks.add(-5, 4, [Float32Array.from([1, 1, 1, 1])]);

    expect(peaks.snapshot()).toEqual(new Float32Array(FINE_PEAK_COUNT));
  });

  it("ignores the part of a buffer past the clip's end, never crashing", () => {
    const peaks = new FinePeaks(SOURCE_MS);
    const lastSlice = FINE_PEAK_COUNT - 1;

    // Samples at 999.5 s and 999.75 s are within the last slice; 1000 s and 1000.25 s are past it.
    peaks.add(SOURCE_MS / 1000 - 0.5, 4, [Float32Array.from([0.4, 0.4, 0.9, 0.9])]);

    expect(peaks.snapshot()[lastSlice]).toBeCloseTo(0.4);
  });

  it("ignores a buffer entirely past the clip's end, never crashing", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    peaks.add(SOURCE_MS / 1000 + 5, 4, [Float32Array.from([1, 1, 1, 1])]);

    expect(peaks.snapshot()).toEqual(new Float32Array(FINE_PEAK_COUNT));
  });

  it("hands out a snapshot that a caller can mutate without changing the reader's own peaks", () => {
    const peaks = new FinePeaks(SOURCE_MS);
    peaks.add(0, 4, [Float32Array.from([0.5, 0.5, 0.5, 0.5])]);

    const first = peaks.snapshot();
    first[0] = 0.999;

    expect(peaks.snapshot()[0]).toBeCloseTo(0.5);
  });

  it("does not report a new step until the filled part has advanced by a full step", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    // One slice filled: short of the 1 % (10-slice) reporting step.
    peaks.add(0, 1, [Float32Array.from([0.5])]);

    expect(peaks.reachedStep()).toBe(false);
  });

  it("reports a new step once the filled part has advanced by a full step, then not again", () => {
    const peaks = new FinePeaks(SOURCE_MS);

    // 10 samples at 1 Hz fill slices 0 through 9: exactly the 1 % reporting step.
    peaks.add(0, 1, [Float32Array.from(Array.from({ length: 10 }, () => 0.5))]);

    expect(peaks.reachedStep()).toBe(true);
    expect(peaks.reachedStep()).toBe(false);
  });

  it("measures the next step from where the last reported step left off", () => {
    const peaks = new FinePeaks(SOURCE_MS);
    peaks.add(0, 1, [Float32Array.from(Array.from({ length: 10 }, () => 0.5))]);
    expect(peaks.reachedStep()).toBe(true);

    // One more slice: short of a second full step measured from slice 10.
    peaks.add(10, 1, [Float32Array.from([0.5])]);
    expect(peaks.reachedStep()).toBe(false);

    // Nine more slices complete the second step.
    peaks.add(11, 1, [Float32Array.from(Array.from({ length: 9 }, () => 0.5))]);
    expect(peaks.reachedStep()).toBe(true);
  });
});
