import { describe, expect, it } from "vitest";
import type { MusicLoudness } from "../../loudness";
import type { LoudnessPassState } from "../../library/loudness-pass";
import { loudnessStatus } from "./music-loudness-known";

const MEASURED: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01]),
  hopPeaks: new Float32Array([0.5]),
};
const QUIET: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.001]),
  hopPeaks: new Float32Array([0.1]),
};
const IDLE: LoudnessPassState = {
  running: false,
  listening: new Set(),
  found: new Map(),
  undecodable: new Set(),
};

describe("loudnessStatus", () => {
  it("is what the pass found, before what was stored", () => {
    const pass = { ...IDLE, found: new Map([["drums", MEASURED]]) };

    expect(loudnessStatus("drums", QUIET, pass)).toEqual({ kind: "known", loudness: MEASURED });
  });

  it("is what was stored when the pass found nothing for the music", () => {
    expect(loudnessStatus("drums", MEASURED, IDLE)).toEqual({ kind: "known", loudness: MEASURED });
  });

  it("is listening while nothing is known and the pass runs, or the stored loudness is not read yet", () => {
    const running = { ...IDLE, running: true };

    expect(loudnessStatus("drums", undefined, running)).toEqual({ kind: "listening" });
    expect(loudnessStatus("drums", "reading", IDLE)).toEqual({ kind: "listening" });
  });

  it("is undecodable while the pass could not measure the music, until its loudness is known", () => {
    const failed = { ...IDLE, undecodable: new Set(["drums"]) };

    expect(loudnessStatus("drums", undefined, failed)).toEqual({ kind: "undecodable" });
    expect(loudnessStatus("drums", undefined, { ...failed, running: true })).toEqual({
      kind: "undecodable",
    });
    expect(loudnessStatus("drums", MEASURED, failed)).toEqual({
      kind: "known",
      loudness: MEASURED,
    });
  });

  it("is still listening once a pass ended without a result for another reason", () => {
    expect(loudnessStatus("drums", undefined, IDLE)).toEqual({ kind: "listening" });
  });
});
