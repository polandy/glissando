import { describe, expect, it } from "vitest";
import { musicLoudnessToJson, parseMusicLoudness } from "./music-loudness-json";
import { measureLoudness } from "./measure-loudness";
import { silence, sineTone } from "./testing/synthetic-tones";

function sampleLoudness() {
  const sampleRate = 48_000;
  const tone = sineTone(1000, 0.3, 2000, sampleRate);
  const quiet = silence(500, sampleRate);
  const samples = new Float32Array(tone.length + quiet.length);
  samples.set(tone);
  samples.set(quiet, tone.length);
  return measureLoudness([samples], sampleRate);
}

describe("musicLoudnessToJson / parseMusicLoudness", () => {
  it("round-trips a measured loudness through JSON within the 0.01 dB rounding", () => {
    const loudness = sampleLoudness();
    const json = musicLoudnessToJson(loudness);

    const parsed = parseMusicLoudness(JSON.parse(JSON.stringify(json)));

    expect(musicLoudnessToJson(parsed)).toEqual(json);
  });

  it("encodes a silent block or hop as null, never -Infinity", () => {
    const loudness = measureLoudness([silence(1000, 48_000)], 48_000);

    const json = musicLoudnessToJson(loudness) as {
      blockLoudnessDb: unknown[];
      hopPeaksDbfs: unknown[];
    };

    expect(json.blockLoudnessDb.every((entry) => entry === null)).toBe(true);
    expect(json.hopPeaksDbfs.every((entry) => entry === null)).toBe(true);
  });

  it("decodes null back to silence (zero mean square and zero peak)", () => {
    const parsed = parseMusicLoudness({
      blockLoudnessDb: [null],
      hopPeaksDbfs: [null, null, null, null],
    });

    expect(parsed.blockMeanSquares[0]).toBe(0);
    expect(parsed.hopPeaks[0]).toBe(0);
  });

  it("rejects a value that is not an object", () => {
    expect(() => parseMusicLoudness("nonsense")).toThrow(/object/);
    expect(() => parseMusicLoudness(null)).toThrow(/object/);
  });

  it("rejects an unknown key", () => {
    expect(() => parseMusicLoudness({ blockLoudnessDb: [], hopPeaksDbfs: [], extra: 1 })).toThrow(
      /"extra"/,
    );
  });

  it("rejects a non-finite number", () => {
    expect(() => parseMusicLoudness({ blockLoudnessDb: [], hopPeaksDbfs: [Infinity] })).toThrow(
      /hopPeaksDbfs/,
    );
    expect(() =>
      parseMusicLoudness({ blockLoudnessDb: [Number.NaN], hopPeaksDbfs: [0, 0, 0, 0] }),
    ).toThrow(/blockLoudnessDb/);
  });

  it("rejects hop peaks and block loudness whose lengths do not match the gating relationship", () => {
    expect(() =>
      parseMusicLoudness({ blockLoudnessDb: [-20, -20], hopPeaksDbfs: [0, 0, 0, 0] }),
    ).toThrow(/blocks/);
  });
});
