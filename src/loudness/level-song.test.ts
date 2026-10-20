import { describe, expect, it } from "vitest";
import { decibelsToGain, levelSong, type SongLevel } from "./level-song";

interface Case {
  readonly name: string;
  readonly loudnessLufs: number | null;
  readonly peakDbfs: number | null;
  readonly ownDb: number;
  readonly expected: SongLevel;
}

const cases: readonly Case[] = [
  {
    name: "a loud song is turned down, not capped",
    loudnessLufs: -8,
    peakDbfs: -6,
    ownDb: 0,
    expected: { levelDb: -6, gainDb: -6, capped: false, maxOwnDb: 11 },
  },
  {
    name: "a quiet song is turned up",
    loudnessLufs: -20,
    peakDbfs: -10,
    ownDb: 0,
    expected: { levelDb: 6, gainDb: 6, capped: false, maxOwnDb: 3 },
  },
  {
    name: "a quiet but peaky song is capped at the ceiling",
    loudnessLufs: -20,
    peakDbfs: -0.5,
    ownDb: 0,
    expected: { levelDb: 6, gainDb: -0.5, capped: true, maxOwnDb: -7 },
  },
  {
    name: "own volume +6 on a near-peak song is capped",
    loudnessLufs: -14,
    peakDbfs: -3,
    ownDb: 6,
    expected: { levelDb: 0, gainDb: 2, capped: true, maxOwnDb: 2 },
  },
  {
    name: "unmeasured (null) loudness levels to 0 dB",
    loudnessLufs: null,
    peakDbfs: -5,
    ownDb: 3,
    expected: { levelDb: 0, gainDb: 3, capped: false, maxOwnDb: 4 },
  },
  {
    name: "no peak measured leaves the ceiling uncapped",
    loudnessLufs: -14,
    peakDbfs: null,
    ownDb: 0,
    expected: { levelDb: 0, gainDb: 0, capped: false, maxOwnDb: Infinity },
  },
];

describe("levelSong", () => {
  it.each(cases)("$name", ({ loudnessLufs, peakDbfs, ownDb, expected }) => {
    const level = levelSong({ loudnessLufs, peakDbfs, ownDb });

    expect(level.levelDb).toBeCloseTo(expected.levelDb, 6);
    expect(level.gainDb).toBeCloseTo(expected.gainDb, 6);
    expect(level.capped).toBe(expected.capped);
    expect(level.maxOwnDb).toBe(expected.maxOwnDb);
  });
});

describe("decibelsToGain", () => {
  it.each([
    [0, 1],
    [20, 10],
    [-20, 0.1],
  ])("converts %d dB to a linear gain of %d", (db, gain) => {
    expect(decibelsToGain(db)).toBeCloseTo(gain, 6);
  });
});
