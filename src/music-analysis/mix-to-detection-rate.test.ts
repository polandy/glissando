import { describe, expect, it } from "vitest";
import { mixToDetectionRate } from "./mix-to-detection-rate";

const TARGET_RATE = 11_025;
const DURATION_SECONDS = 2;
/** Samples at the start and end of the output ignored: the filter's ramp-in and ramp-out. */
const EDGE_SECONDS = 0.1;
const PASSBAND_TOLERANCE_DB = 0.5;
const MIN_STOPBAND_ATTENUATION_DB = 40;

function sine(hz: number, rate: number, amplitude = 1): Float32Array {
  return Float32Array.from(
    { length: rate * DURATION_SECONDS },
    (_unused, n) => amplitude * Math.sin((2 * Math.PI * hz * n) / rate),
  );
}

/** Root-mean-square level of the middle of `samples`, in dB relative to a unit-amplitude sine. */
function levelDb(samples: Float32Array, rate: number): number {
  const edge = Math.round(EDGE_SECONDS * rate);
  let sum = 0;
  for (let n = edge; n < samples.length - edge; n += 1) sum += (samples[n] as number) ** 2;
  const rms = Math.sqrt(sum / (samples.length - 2 * edge));
  return 20 * Math.log10(rms / Math.SQRT1_2);
}

describe("mixToDetectionRate", () => {
  it.each([
    [48_000, 96_000],
    [44_100, 88_200],
    [22_050, 22_050],
    [48_000, 48_000],
  ])("gives %i Hz input at the target rate the right number of samples", (rate, length) => {
    const output = mixToDetectionRate([new Float32Array(length)], rate, TARGET_RATE);

    expect(output).toHaveLength(Math.floor((length * TARGET_RATE) / rate));
  });

  it("averages the channels", () => {
    const output = mixToDetectionRate(
      [Float32Array.of(1, 0.5, -1), Float32Array.of(0, 0.5, -0.5)],
      TARGET_RATE,
      TARGET_RATE,
    );

    expect([...output]).toEqual([0.5, 0.5, -0.75]);
  });

  it("averages the channels before resampling, so opposite channels cancel", () => {
    const tone = sine(1000, 48_000);
    const inverted = tone.map((sample) => -sample);

    const output = mixToDetectionRate([tone, inverted], 48_000, TARGET_RATE);

    expect(Math.max(...output.map(Math.abs))).toBe(0);
  });

  it("passes a song already at the target rate through as its mix", () => {
    const tone = sine(1000, TARGET_RATE);

    expect(mixToDetectionRate([tone], TARGET_RATE, TARGET_RATE)).toEqual(tone);
  });

  it("rejects a song without channels", () => {
    expect(() => mixToDetectionRate([], 48_000, TARGET_RATE)).toThrow("at least one channel");
  });

  it.each([
    [48_000, 1000],
    [48_000, 4000],
    [44_100, 1000],
    [44_100, 4000],
    [22_050, 1000],
    [22_050, 4000],
  ])("keeps a tone from %i Hz input at %i Hz at its amplitude", (rate, hz) => {
    const output = mixToDetectionRate([sine(hz, rate)], rate, TARGET_RATE);

    expect(Math.abs(levelDb(output, TARGET_RATE))).toBeLessThan(PASSBAND_TOLERANCE_DB);
  });

  it.each([
    [48_000, 7000],
    [48_000, 9000],
    [44_100, 7000],
    [44_100, 9000],
  ])("attenuates a tone from %i Hz input at %i Hz, above the target Nyquist", (rate, hz) => {
    const output = mixToDetectionRate([sine(hz, rate)], rate, TARGET_RATE);

    expect(levelDb(output, TARGET_RATE)).toBeLessThan(-MIN_STOPBAND_ATTENUATION_DB);
  });

  it("keeps the timing of a tone: the output sample n is the input at n * ratio", () => {
    const hz = 500;
    const output = mixToDetectionRate([sine(hz, 48_000)], 48_000, TARGET_RATE);
    const checked = TARGET_RATE; // one second in, past the ramp-in
    for (let n = checked; n < checked + 20; n += 1) {
      const expected = Math.sin((2 * Math.PI * hz * n) / TARGET_RATE);
      expect(Math.abs((output[n] as number) - expected)).toBeLessThan(0.02);
    }
  });
});
