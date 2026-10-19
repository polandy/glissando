import { describe, expect, it } from "vitest";
import { volumeView, volumeViewInput, type VolumeViewInput } from "./volume-view";

const LOUD_SONG: VolumeViewInput = {
  status: "known",
  loudnessLufs: -8.4,
  peakDbfs: -0.1,
  ownDb: 0,
};
const QUIET_SONG: VolumeViewInput = {
  status: "known",
  loudnessLufs: -21,
  peakDbfs: -10,
  ownDb: -4,
};
// Quiet in LUFS but close to its own peak: levelling alone already wants more gain than the
// ceiling allows (mirrors the mockup's "Rain Walk.m4a").
const PEAKY_SONG: VolumeViewInput = {
  status: "known",
  loudnessLufs: -19,
  peakDbfs: -3.5,
  ownDb: 0,
};

describe("volumeView", () => {
  it("is unmeasured while the song is still being listened for", () => {
    const view = volumeView({ status: "listening", loudnessLufs: null, peakDbfs: null, ownDb: 0 });
    expect(view.measured).toBe(false);
    expect(view.sub).toEqual({ kind: "unmeasured" });
    expect(view.hint).toEqual({ kind: "measuring" });
  });

  it("says so when the device cannot decode the song", () => {
    const view = volumeView({
      status: "undecodable",
      loudnessLufs: null,
      peakDbfs: null,
      ownDb: 0,
    });
    expect(view.measured).toBe(false);
    expect(view.hint).toEqual({ kind: "undecodable" });
  });

  it("reads as levelled, same loudness, when a measured song keeps its own volume at 0", () => {
    const view = volumeView(LOUD_SONG);
    expect(view.levelled).toBe(true);
    expect(view.sub).toEqual({ kind: "sameLoudness" });
    expect(view.hint).toEqual({ kind: "levelledBy", levelDb: view.levelDb });
  });

  it("reads quieter below 0 and louder above 0, with no hint once past the levelled position", () => {
    const quieter = volumeView(QUIET_SONG);
    expect(quieter.levelled).toBe(false);
    expect(quieter.sub).toEqual({ kind: "quieter" });
    expect(quieter.hint).toEqual({ kind: "none" });

    const louder = volumeView({ ...QUIET_SONG, ownDb: 2 });
    expect(louder.sub).toEqual({ kind: "louder" });
  });

  it("computes the level: target minus the excerpt's loudness", () => {
    const view = volumeView(LOUD_SONG);
    expect(view.levelDb).toBeCloseTo(-14 - -8.4, 5);
  });

  it("caps the slider's reach at the peak ceiling and flags it once reached", () => {
    // levelDb = -14 - -21 = 7; ceiling gain = -1 - -10 = 9; maxOwnDb = floor(9 - 7) = 2.
    const atCap = volumeView({ ...QUIET_SONG, ownDb: 2 });
    expect(atCap.capDb).toBe(2);
    expect(atCap.capReached).toBe(true);
    expect(atCap.atCap).toBe(true);
    expect(atCap.hint).toEqual({ kind: "cappedMax" });

    const belowCap = volumeView({ ...QUIET_SONG, ownDb: 1 });
    expect(belowCap.atCap).toBe(false);
    expect(belowCap.hint).toEqual({ kind: "none" });
  });

  it("leaves the cap at the ceiling's own number when it already falls inside -12..+6", () => {
    // levelDb = -14 - -8.4 = -5.6; ceiling gain = -1 - -0.1 = -0.9; maxOwnDb = floor(-0.9 - -5.6) = 4.
    const view = volumeView(LOUD_SONG);
    expect(view.capDb).toBe(4);
    expect(view.capReached).toBe(true);
  });

  it("shows the capped volume, not the stored one, once a new excerpt lowers the ceiling below it", () => {
    // Stored +6 from a quieter excerpt; this one's peak caps the own volume at +2.
    const view = volumeView({ status: "known", loudnessLufs: -14, peakDbfs: -3, ownDb: 6 });
    expect(view.capDb).toBe(2);
    expect(view.shownDb).toBe(2);
    expect(view.sub).toEqual({ kind: "asFarAsItGoes" });
  });

  it("shows the stored volume while it stays within the ceiling", () => {
    expect(volumeView(QUIET_SONG).shownDb).toBe(-4);
  });

  it("never reports a cap above +6, the slider's own top", () => {
    const view = volumeView({ status: "known", loudnessLufs: -14, peakDbfs: -20, ownDb: 0 });
    expect(view.capDb).toBe(6);
    expect(view.capReached).toBe(false);
  });

  it("reports how many dB short levelling alone stays when even the levelled position is capped", () => {
    const view = volumeView(PEAKY_SONG);
    // levelDb = -14 - -19 = 5; ceiling gain = -1 - -3.5 = 2.5; maxOwnDb = floor(2.5 - 5) = -3.
    expect(view.shortDb).toBeCloseTo(3, 5);
    expect(view.sub).toEqual({ kind: "asFarAsItGoes" });
    expect(view.hint).toEqual({ kind: "cappedShort", shortDb: 3 });
  });

  it("clamps the cap to -12 at its lowest", () => {
    const view = volumeView(PEAKY_SONG);
    expect(view.capDb).toBe(-3);
  });
});

describe("volumeViewInput", () => {
  it("passes the excerpt's loudness only once the song is known", () => {
    const known = volumeViewInput(
      {
        kind: "known",
        loudness: { blockMeanSquares: new Float32Array(), hopPeaks: new Float32Array() },
      },
      -10,
      -2,
      1,
    );
    expect(known).toEqual({ status: "known", loudnessLufs: -10, peakDbfs: -2, ownDb: 1 });

    const listening = volumeViewInput({ kind: "listening" }, -10, -2, 1);
    expect(listening).toEqual({
      status: "listening",
      loudnessLufs: null,
      peakDbfs: null,
      ownDb: 1,
    });
  });
});
