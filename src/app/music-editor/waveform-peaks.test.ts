import { describe, expect, it } from "vitest";
import { waveformPeaks } from "./waveform-peaks";

describe("waveformPeaks", () => {
  it("takes the loudest sample of each bar, scaled so the loudest bar is 1", () => {
    const samples = Float32Array.from([0.1, -0.2, 0.05, 0.4, -0.1, 0.2]);

    expect(waveformPeaks(samples, 3)).toEqual([0.5, 1, 0.5]);
  });

  it("spreads samples that do not divide evenly over the bars", () => {
    expect(waveformPeaks(Float32Array.from([1, 0.5, 0.5, 0.5, 0.25]), 2)).toEqual([1, 0.5]);
  });

  it("is flat for silence, never dividing by zero", () => {
    expect(waveformPeaks(new Float32Array(4), 2)).toEqual([0, 0]);
  });
});
