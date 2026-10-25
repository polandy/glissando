import { NO_SONG_BEATS, placeSongs } from "../../compose";
import { levelMs, syntheticLoudness } from "../../compose/energy/testing/synthetic-loudness";
import { describe, expect, it } from "vitest";
import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
import { pictureEditorView } from "./picture-editor-view";
import {
  music,
  STEADY_BEAT_MS,
  STEADY_BEATS,
  STEADY_FIRST_BEAT_MS,
  stored,
  withPicture,
} from "./testing/picture-editor-fixtures";

describe("pictureEditorView timing", () => {
  it("plays the slide's real duration, as the music sets it", () => {
    const withMusic = {
      ...stored,
      songs: [{ id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" }],
    };

    expect(pictureEditorView(withMusic, "p3", NO_FOCUS_KNOWN, NO_SONG_BEATS).durationMs).toBe(
      10_000,
    );
  });

  it("plays an automatic slide to the beat, its transition lasting whole beats", () => {
    const withMusic = { ...stored, songs: [music(30_000)] };

    const first = pictureEditorView(
      withMusic,
      "p1",
      NO_FOCUS_KNOWN,
      new Map([["m", STEADY_BEATS]]),
    );
    const second = pictureEditorView(
      withMusic,
      "p2",
      NO_FOCUS_KNOWN,
      new Map([["m", STEADY_BEATS]]),
    );

    expect([first.durationMs, second.durationMs]).toEqual([9700, 10_400]);
    expect(first.transition.durationMs).toBe(800);
  });

  it("changes the automatic slides on the beats of whichever song plays, not only the first's", () => {
    const quiet = { id: "quiet", fileName: "quiet.mp3", durationMs: 6000, mimeType: "audio/mpeg" };
    const playlist = { ...stored, songs: [quiet, music(30_000)] };
    const songAtMs = placeSongs(playlist)[1]?.atMs ?? Number.NaN;
    const beats = new Map([["m", STEADY_BEATS]]);

    const first = pictureEditorView(playlist, "p1", NO_FOCUS_KNOWN, beats).durationMs;
    const second = pictureEditorView(playlist, "p2", NO_FOCUS_KNOWN, beats).durationMs;

    const beatOfSong = (atMs: number) => (atMs - songAtMs - STEADY_FIRST_BEAT_MS) % STEADY_BEAT_MS;
    expect([beatOfSong(first), beatOfSong(first + second)]).toEqual([0, 0]);
  });

  it("shows an own duration and still names the automatic one", () => {
    const timed = withPicture(1, { durationMs: 8000 });

    const view = pictureEditorView(timed, "p2", NO_FOCUS_KNOWN, NO_SONG_BEATS);

    expect(view.durationMs).toBe(8000);
    expect(view.ownDuration).toBe(true);
    expect(view.durationBasis).toEqual({ kind: "seconds-per-picture", automaticMs: 4000 });
  });

  it("with music, counts the pictures sharing the rest and names their share", () => {
    const timed = { ...withPicture(1, { durationMs: 8000 }), songs: [music(30_000)] };

    expect(pictureEditorView(timed, "p2", NO_FOCUS_KNOWN, NO_SONG_BEATS).durationBasis).toEqual({
      kind: "music",
      automaticCount: 2,
      shareMs: 11_000,
      clamped: false,
    });
    expect(pictureEditorView(timed, "p1", NO_FOCUS_KNOWN, NO_SONG_BEATS).durationBasis).toEqual({
      kind: "music",
      automaticCount: 2,
      shareMs: 11_000,
      clamped: false,
    });
  });

  it("with music and every picture timed, names no share", () => {
    const all = {
      ...stored,
      pictures: stored.pictures.map((picture) => ({ ...picture, durationMs: 3000 })),
      songs: [music(30_000)],
    };

    expect(pictureEditorView(all, "p1", NO_FOCUS_KNOWN, NO_SONG_BEATS).durationBasis).toEqual({
      kind: "music",
      automaticCount: 0,
      shareMs: null,
      clamped: false,
    });
  });

  it("with music, marks the automatic pictures clamped once the own durations use it up", () => {
    const outlasted = { ...withPicture(1, { durationMs: 15_000 }), songs: [music(17_000)] };

    expect(pictureEditorView(outlasted, "p1", NO_FOCUS_KNOWN, NO_SONG_BEATS).durationBasis).toEqual(
      {
        kind: "music",
        automaticCount: 2,
        shareMs: 2000,
        clamped: true,
      },
    );
  });

  it("with trimmed music, shares the excerpt rather than the whole track", () => {
    const trimmed = {
      ...withPicture(1, { durationMs: 8000 }),
      songs: [{ ...music(60_000), trim: { startMs: 10_000, endMs: 40_000 } }],
    };

    expect(
      pictureEditorView(trimmed, "p1", NO_FOCUS_KNOWN, NO_SONG_BEATS).durationBasis,
    ).toMatchObject({
      shareMs: 11_000,
    });
  });

  it("with trimmed music, marks the pictures clamped against the excerpt", () => {
    const trimmed = {
      ...withPicture(1, { durationMs: 15_000 }),
      songs: [{ ...music(60_000), trim: { startMs: 0, endMs: 17_000 } }],
    };

    expect(
      pictureEditorView(trimmed, "p1", NO_FOCUS_KNOWN, NO_SONG_BEATS).durationBasis,
    ).toMatchObject({
      clamped: true,
    });
  });

  describe("energy pacing (ADR-0046)", () => {
    const quietThenLoud = new Map([
      ["m", syntheticLoudness([...levelMs(-24, 15_000), ...levelMs(-16, 15_000)])],
    ]);

    it("paces the automatic slide durations by the music's energy once the slideshow follows it", () => {
      const withEnergy = { ...stored, songs: [music(30_000)], energyPacing: true as const };

      const first = pictureEditorView(
        withEnergy,
        "p1",
        NO_FOCUS_KNOWN,
        NO_SONG_BEATS,
        quietThenLoud,
      );
      const third = pictureEditorView(
        withEnergy,
        "p3",
        NO_FOCUS_KNOWN,
        NO_SONG_BEATS,
        quietThenLoud,
      );

      // p1 (0-10 000 before pacing) sits in the quiet half, p3 (20 000-30 000) in the loud half.
      expect(first.durationMs).toBeGreaterThan(third.durationMs);
    });

    it("does not pace by energy unless the slideshow follows it, even with loudness known", () => {
      const withMusic = { ...stored, songs: [music(30_000)] };

      const first = pictureEditorView(
        withMusic,
        "p1",
        NO_FOCUS_KNOWN,
        NO_SONG_BEATS,
        quietThenLoud,
      );
      const third = pictureEditorView(
        withMusic,
        "p3",
        NO_FOCUS_KNOWN,
        NO_SONG_BEATS,
        quietThenLoud,
      );

      expect(first.durationMs).toBe(third.durationMs);
      expect(first.durationMs).toBe(10_000);
    });
  });
});
