import { describe, expect, it } from "vitest";
import { detectBeats } from "./detect-beats";
import type { MusicBeats } from "./music-beats";
import {
  acceleratingDrums,
  beatlessPad,
  clickTrack,
  drumlessBallad,
  drumPattern,
  SYNTHETIC_SAMPLE_RATE,
  type SyntheticTrack,
} from "./testing/synthetic-music";

/** A found beat counts as the true one within this distance (ADR-0021 measured ±70 ms). */
const BEAT_TOLERANCE_MS = 50;
/** The share of true beats that must be found, and of found beats that must be true. */
const MIN_MATCHED_SHARE = 0.95;
const SEED = 12_345;
/** How close a found beat sits to the true one: within one analysis hop (128 samples). */
const ON_THE_BEAT_TOLERANCE_MS = 12;

/** The share of `beatsMs` that have one of `othersMs` within the tolerance. */
function matchedShare(beatsMs: readonly number[], othersMs: readonly number[]): number {
  const matched = beatsMs.filter((beatMs) =>
    othersMs.some((otherMs) => Math.abs(otherMs - beatMs) <= BEAT_TOLERANCE_MS),
  );
  return matched.length / beatsMs.length;
}

function beatsOf(result: MusicBeats): { beatsMs: readonly number[]; beatsPerMinute: number } {
  if (result.kind !== "beats") {
    throw new Error(`expected beats, got ${result.kind}`);
  }
  return result;
}

function expectBeatsFound(track: SyntheticTrack, expectedBpm: number, bpmTolerance: number): void {
  const { beatsMs, beatsPerMinute } = beatsOf(detectBeats(track.samples, track.sampleRate));

  expect(beatsPerMinute).toBeGreaterThanOrEqual(expectedBpm - bpmTolerance);
  expect(beatsPerMinute).toBeLessThanOrEqual(expectedBpm + bpmTolerance);
  expect(matchedShare(track.beatsMs, beatsMs)).toBeGreaterThanOrEqual(MIN_MATCHED_SHARE);
  expect(matchedShare(beatsMs, track.beatsMs)).toBeGreaterThanOrEqual(MIN_MATCHED_SHARE);
}

describe("detectBeats", () => {
  it("finds every beat of a click track and its tempo", () => {
    expectBeatsFound(clickTrack(30, 120), 120, 1);
  });

  it("finds the beats of a drum pattern with hats between them, not the hats' double tempo", () => {
    expectBeatsFound(drumPattern(30, 96, SEED), 96, 1);
  });

  it("finds the beats of slow drumless music, not twice its tempo", () => {
    expectBeatsFound(drumlessBallad(40, 72), 72, 1);
  });

  it("follows music that speeds up, beat by beat", () => {
    expectBeatsFound(acceleratingDrums(40, 100, 112, SEED), 106, 3);
  });

  it.each([
    ["a click track", clickTrack(30, 120)],
    ["a drum pattern", drumPattern(30, 96, SEED)],
    ["drumless music", drumlessBallad(40, 72)],
  ])("places the beats of %s on the true ones, not merely near them", (_, track) => {
    const { beatsMs } = beatsOf(detectBeats(track.samples, track.sampleRate));
    const offsetsMs = track.beatsMs.map((trueMs) =>
      Math.min(...beatsMs.map((foundMs) => Math.abs(foundMs - trueMs))),
    );

    expect(Math.max(...offsetsMs)).toBeLessThanOrEqual(ON_THE_BEAT_TOLERANCE_MS);
  });

  it("gives beat times as whole milliseconds of the track", () => {
    const track = clickTrack(10, 120);
    const { beatsMs } = beatsOf(detectBeats(track.samples, track.sampleRate));

    expect(beatsMs.length).toBeGreaterThan(0);
    expect(beatsMs.every((beatMs) => Number.isInteger(beatMs))).toBe(true);
  });

  it("finds no clear beat in a beatless pad", () => {
    const track = beatlessPad(30, SEED);

    expect(detectBeats(track.samples, track.sampleRate)).toEqual({ kind: "none" });
  });

  it("finds no beat in silence", () => {
    expect(
      detectBeats(new Float32Array(SYNTHETIC_SAMPLE_RATE * 10), SYNTHETIC_SAMPLE_RATE),
    ).toEqual({ kind: "none" });
  });

  it("finds no beat in a track too short to hold one", () => {
    expect(detectBeats(new Float32Array(100), SYNTHETIC_SAMPLE_RATE)).toEqual({ kind: "none" });
  });
});
