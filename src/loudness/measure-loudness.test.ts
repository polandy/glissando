import { describe, expect, it } from "vitest";
import { excerptLoudnessLufs } from "./excerpt-loudness";
import { measureLoudness } from "./measure-loudness";
import { concatSegments, silence, sineTone } from "./testing/synthetic-tones";

/** BS.1770-4's own reference tolerance for a conforming meter. */
const LUFS_REFERENCE_TOLERANCE = 0.1;
const REFERENCE_TONE_HZ = 997;
const REFERENCE_DURATION_MS = 20_000;

describe("measureLoudness against the BS.1770-4 reference tones", () => {
  it.each([48_000, 44_100])(
    "measures a full-scale 997 Hz sine in one channel as -3.01 LUFS at %d Hz",
    (sampleRate) => {
      const tone = sineTone(REFERENCE_TONE_HZ, 1.0, REFERENCE_DURATION_MS, sampleRate);
      const loudness = measureLoudness([tone], sampleRate);

      expect(excerptLoudnessLufs(loudness, 0, REFERENCE_DURATION_MS)).toBeCloseTo(
        -3.01,
        1,
      );
    },
  );

  it("measures the same sine in both channels as 0.0 LUFS", () => {
    const sampleRate = 48_000;
    const tone = sineTone(REFERENCE_TONE_HZ, 1.0, REFERENCE_DURATION_MS, sampleRate);
    const loudness = measureLoudness([tone, tone], sampleRate);

    expect(excerptLoudnessLufs(loudness, 0, REFERENCE_DURATION_MS)).toBeCloseTo(0.0, 1);
  });

  it("measures a -20 dB sine as 20 dB quieter than full scale", () => {
    const sampleRate = 48_000;
    const full = measureLoudness([sineTone(REFERENCE_TONE_HZ, 1.0, REFERENCE_DURATION_MS, sampleRate)], sampleRate);
    const quiet = measureLoudness(
      [sineTone(REFERENCE_TONE_HZ, 0.1, REFERENCE_DURATION_MS, sampleRate)],
      sampleRate,
    );

    const fullLufs = excerptLoudnessLufs(full, 0, REFERENCE_DURATION_MS) as number;
    const quietLufs = excerptLoudnessLufs(quiet, 0, REFERENCE_DURATION_MS) as number;

    expect(fullLufs - quietLufs).toBeCloseTo(20, 1);
  });
});

describe("measureLoudness gating", () => {
  it("gates out silence appended after a tone", () => {
    const sampleRate = 48_000;
    const toneMs = 10_000;
    const tone = sineTone(1000, 1.0, toneMs, sampleRate);
    const withSilence = concatSegments(tone, silence(10_000, sampleRate));

    const toneOnly = measureLoudness([tone], sampleRate);
    const combined = measureLoudness([withSilence], sampleRate);

    const expected = excerptLoudnessLufs(toneOnly, 0, toneMs) as number;
    const actual = excerptLoudnessLufs(combined, 0, toneMs + 10_000) as number;

    expect(Math.abs(actual - expected)).toBeLessThan(LUFS_REFERENCE_TOLERANCE + 0.1);
  });

  it("relative-gates a quiet half out, leaving only the loud half's loudness", () => {
    const sampleRate = 48_000;
    const loudMs = 10_000;
    const quietMs = 10_000;
    const loud = sineTone(1000, 1.0, loudMs, sampleRate);
    const quiet = sineTone(1000, 10 ** (-30 / 20), quietMs, sampleRate);
    const track = concatSegments(loud, quiet);

    const loudOnly = measureLoudness([loud], sampleRate);
    const combined = measureLoudness([track], sampleRate);

    const expected = excerptLoudnessLufs(loudOnly, 0, loudMs) as number;
    const actual = excerptLoudnessLufs(combined, 0, loudMs + quietMs) as number;

    expect(Math.abs(actual - expected)).toBeLessThan(LUFS_REFERENCE_TOLERANCE + 0.1);
  });

  it("returns null for a silent excerpt", () => {
    const sampleRate = 48_000;
    const loudness = measureLoudness([silence(5000, sampleRate)], sampleRate);

    expect(excerptLoudnessLufs(loudness, 0, 5000)).toBeNull();
  });

  it("absolute-gates out a track that is quiet throughout, below -70 LUFS on its own", () => {
    // ~-80 LUFS: far too quiet to pass BS.1770's absolute gate, with no louder block around to
    // trigger the relative gate instead — isolates the absolute gate from the relative one.
    const sampleRate = 48_000;
    const veryQuietAmplitude = 10 ** (-80 / 20);
    const loudness = measureLoudness([sineTone(1000, veryQuietAmplitude, 5000, sampleRate)], sampleRate);

    expect(excerptLoudnessLufs(loudness, 0, 5000)).toBeNull();
  });

  it("returns null when the excerpt holds no whole 400 ms block", () => {
    const sampleRate = 48_000;
    const loudness = measureLoudness([sineTone(1000, 1.0, 5000, sampleRate)], sampleRate);

    expect(excerptLoudnessLufs(loudness, 0, 200)).toBeNull();
  });
});

describe("measureLoudness on excerpts of a two-level track", () => {
  it("levels each half of a track to that half's own loudness", () => {
    const sampleRate = 48_000;
    const quiet = sineTone(1000, 10 ** (-20 / 20), 10_000, sampleRate);
    const loud = sineTone(1000, 10 ** (-5 / 20), 10_000, sampleRate);
    const track = concatSegments(quiet, loud);

    const quietOnly = measureLoudness([quiet], sampleRate);
    const loudOnly = measureLoudness([loud], sampleRate);
    const combined = measureLoudness([track], sampleRate);

    expect(excerptLoudnessLufs(combined, 0, 10_000)).toBeCloseTo(
      excerptLoudnessLufs(quietOnly, 0, 10_000) as number,
      1,
    );
    expect(excerptLoudnessLufs(combined, 10_000, 20_000)).toBeCloseTo(
      excerptLoudnessLufs(loudOnly, 0, 10_000) as number,
      1,
    );
  });
});

describe("measureLoudness performance", () => {
  it("measures a 300 s stereo signal at 44.1 kHz in one pass", () => {
    const sampleRate = 44_100;
    const durationMs = 300_000;
    const channel = sineTone(440, 0.5, durationMs, sampleRate);

    const loudness = measureLoudness([channel, channel], sampleRate);

    const hopsPerBlock = 4; // 400 ms block / 100 ms hop
    expect(loudness.hopPeaks.length).toBe(Math.floor((sampleRate * durationMs) / 1000 / (sampleRate / 10)));
    expect(loudness.blockMeanSquares.length).toBe(loudness.hopPeaks.length - hopsPerBlock + 1);
  });
});
