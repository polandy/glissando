import { describe, expect, it } from "vitest";
import { ALTERNATE_TRANSITION, DEFAULT_SLIDESHOW_TRANSITION } from "../library/own-timing";
import { MAX_SECONDS_PER_PICTURE } from "../library/stored-slideshow";
import { MOOD_PROFILES, moodSettings, moodTempo } from "./mood-settings";
import { NO_SONG_BEATS, type SongBeats } from "./playlist";

describe("MOOD_PROFILES", () => {
  it("matches the MOOD.md table", () => {
    expect(MOOD_PROFILES.calm).toEqual({
      targetSeconds: 7,
      beatStep: 4,
      transition: DEFAULT_SLIDESHOW_TRANSITION,
      transitionShare: 0.45,
      maxTransitionMs: 1600,
      kenBurnsStrength: 0.5,
    });
    expect(MOOD_PROFILES.lively).toEqual({
      targetSeconds: 3,
      beatStep: 2,
      transition: ALTERNATE_TRANSITION,
      transitionShare: 0.15,
      maxTransitionMs: 500,
      kenBurnsStrength: 1.4,
    });
  });
});

describe("moodSettings", () => {
  it.each([
    ["calm", 76, 6.315789473684211],
    ["calm", 128, 7.5],
    ["lively", 128, 2.8125],
  ] as const)("paces %s at %d BPM to %d seconds per picture", (mood, bpm, seconds) => {
    expect(moodSettings(mood, bpm).secondsPerPicture).toBeCloseTo(seconds, 10);
  });

  it("without a tempo uses the target seconds as they are", () => {
    expect(moodSettings("calm", undefined).secondsPerPicture).toBe(7);
    expect(moodSettings("lively", undefined).secondsPerPicture).toBe(3);
  });

  it("clamps a seconds-per-picture that a very slow tempo would push past the maximum", () => {
    // At 10 BPM a single beat step already outlasts MAX_SECONDS_PER_PICTURE.
    expect(moodSettings("calm", 10).secondsPerPicture).toBe(MAX_SECONDS_PER_PICTURE);
  });

  it("carries the mood's transition, transition length and Ken Burns strength", () => {
    expect(moodSettings("calm", undefined)).toMatchObject({
      transition: "crossfade",
      transitionShare: 0.45,
      maxTransitionMs: 1600,
      kenBurnsStrength: 0.5,
    });
    expect(moodSettings("lively", undefined)).toMatchObject({
      transition: "alternate",
      transitionShare: 0.15,
      maxTransitionMs: 500,
      kenBurnsStrength: 1.4,
    });
  });
});

const BEATS_SONG = {
  id: "song-beats",
  fileName: "beats.mp3",
  durationMs: 60000,
  mimeType: "audio/mpeg",
};

function beatsFound(beatsPerMinute: number): SongBeats {
  return new Map([["song-beats", { kind: "beats" as const, beatsMs: [0, 500], beatsPerMinute }]]);
}

describe("moodTempo", () => {
  it("is the first song's tempo in play order with a clear beat", () => {
    expect(moodTempo({ songs: [BEATS_SONG] }, beatsFound(120))).toBe(120);
  });

  it("skips a song opted out of beats with 'even' picture changes", () => {
    const evenSong = { ...BEATS_SONG, pictureChanges: "even" as const };
    const songs = [evenSong, { ...BEATS_SONG, id: "song-2" }];
    const beats: SongBeats = new Map([
      ["song-beats", { kind: "beats", beatsMs: [0], beatsPerMinute: 90 }],
      ["song-2", { kind: "beats", beatsMs: [0], beatsPerMinute: 100 }],
    ]);

    expect(moodTempo({ songs }, beats)).toBe(100);
  });

  it("is undefined without songs", () => {
    expect(moodTempo({ songs: [] }, NO_SONG_BEATS)).toBeUndefined();
  });

  it("is undefined when no song has a clear beat yet", () => {
    expect(moodTempo({ songs: [BEATS_SONG] }, NO_SONG_BEATS)).toBeUndefined();
  });
});
