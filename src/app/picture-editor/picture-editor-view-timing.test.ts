import { NO_BEATS } from "../../beats";
import { describe, expect, it } from "vitest";
import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
import { pictureEditorView } from "./picture-editor-view";
import { music, STEADY_BEATS, stored, withPicture } from "./testing/picture-editor-fixtures";

describe("pictureEditorView timing", () => {
  it("plays the slide's real duration, as the music sets it", () => {
    const withMusic = {
      ...stored,
      music: { id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" },
    };

    expect(pictureEditorView(withMusic, "p3", NO_FOCUS_KNOWN, NO_BEATS).durationMs).toBe(10_000);
  });

  it("plays an automatic slide to the beat, its transition lasting whole beats", () => {
    const withMusic = { ...stored, music: music(30_000) };

    const first = pictureEditorView(withMusic, "p1", NO_FOCUS_KNOWN, STEADY_BEATS);
    const second = pictureEditorView(withMusic, "p2", NO_FOCUS_KNOWN, STEADY_BEATS);

    expect([first.durationMs, second.durationMs]).toEqual([10_100, 10_000]);
    expect(first.transition.durationMs).toBe(800);
  });

  it("shows an own duration and still names the automatic one", () => {
    const timed = withPicture(1, { durationMs: 8000 });

    const view = pictureEditorView(timed, "p2", NO_FOCUS_KNOWN, NO_BEATS);

    expect(view.durationMs).toBe(8000);
    expect(view.ownDuration).toBe(true);
    expect(view.durationBasis).toEqual({ kind: "seconds-per-picture", automaticMs: 4000 });
  });

  it("with music, counts the pictures sharing the rest and names their share", () => {
    const timed = { ...withPicture(1, { durationMs: 8000 }), music: music(30_000) };

    expect(pictureEditorView(timed, "p2", NO_FOCUS_KNOWN, NO_BEATS).durationBasis).toEqual({
      kind: "music",
      automaticCount: 2,
      shareMs: 11_000,
      clamped: false,
    });
    expect(pictureEditorView(timed, "p1", NO_FOCUS_KNOWN, NO_BEATS).durationBasis).toEqual({
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
      music: music(30_000),
    };

    expect(pictureEditorView(all, "p1", NO_FOCUS_KNOWN, NO_BEATS).durationBasis).toEqual({
      kind: "music",
      automaticCount: 0,
      shareMs: null,
      clamped: false,
    });
  });

  it("with music, marks the automatic pictures clamped once the own durations use it up", () => {
    const outlasted = { ...withPicture(1, { durationMs: 15_000 }), music: music(17_000) };

    expect(pictureEditorView(outlasted, "p1", NO_FOCUS_KNOWN, NO_BEATS).durationBasis).toEqual({
      kind: "music",
      automaticCount: 2,
      shareMs: 2000,
      clamped: true,
    });
  });

  it("with trimmed music, shares the excerpt rather than the whole track", () => {
    const trimmed = {
      ...withPicture(1, { durationMs: 8000 }),
      music: { ...music(60_000), trim: { startMs: 10_000, endMs: 40_000 } },
    };

    expect(pictureEditorView(trimmed, "p1", NO_FOCUS_KNOWN, NO_BEATS).durationBasis).toMatchObject({
      shareMs: 11_000,
    });
  });

  it("with trimmed music, marks the pictures clamped against the excerpt", () => {
    const trimmed = {
      ...withPicture(1, { durationMs: 15_000 }),
      music: { ...music(60_000), trim: { startMs: 0, endMs: 17_000 } },
    };

    expect(pictureEditorView(trimmed, "p1", NO_FOCUS_KNOWN, NO_BEATS).durationBasis).toMatchObject({
      clamped: true,
    });
  });
});
