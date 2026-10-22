import { describe, expect, it } from "vitest";
import { excerptLoudnessLufs, excerptPeakDbfs, MUSIC_TARGET_LOUDNESS_LUFS } from "../../loudness";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import type { BeatsStatus } from "../beats/music-beats-known";
import { firstSongView } from "./testing/first-song-view";

const LISTENING: BeatsStatus = { kind: "listening" };

const TRACK_MS = 204_000;
const MUSIC: StoredMusic = {
  id: "m1",
  fileName: "Sommerwind.mp3",
  durationMs: TRACK_MS,
  mimeType: "audio/mpeg",
};

function slideshow(
  music: Partial<StoredMusic>,
  durations: readonly (number | undefined)[] = [undefined, undefined, undefined, undefined],
): StoredSlideshow {
  const pictures: StoredPicture[] = durations.map((durationMs, index) => ({
    id: `p${index}`,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `p${index}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    ...(durationMs === undefined ? {} : { durationMs }),
  }));
  return {
    id: "show",
    title: "Sommer am See",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    songs: [{ ...MUSIC, ...music }],
  };
}

describe("musicEditorView", () => {
  it("shows the whole track, automatic fades off, with the pictures sharing it", () => {
    const view = firstSongView(slideshow({}), LISTENING);

    expect(view).toMatchObject({
      fileName: "Sommerwind.mp3",
      durationMs: TRACK_MS,
      startMs: 0,
      endMs: TRACK_MS,
      trimmed: false,
      slideshowMs: TRACK_MS,
      audibleEndMs: TRACK_MS,
      pictureCount: 4,
      fadeIn: { ms: 0, own: false, reason: "track-starts" },
      fadeOut: { ms: 0, own: false, reason: "track-ends" },
      note: { kind: "shared", automaticCount: 4, shareMs: 51_000 },
    });
  });

  it("explains short automatic fades where the excerpt cuts the track", () => {
    const view = firstSongView(slideshow({ trim: { startMs: 12_000, endMs: 150_000 } }), LISTENING);

    expect(view.trimmed).toBe(true);
    expect(view.fadeIn).toEqual({ ms: 2000, own: false, reason: "excerpt-starts-mid-track" });
    expect(view.fadeOut).toEqual({ ms: 5000, own: false, reason: "excerpt-ends-early" });
  });

  it("shows own fades as own, 0 included", () => {
    const view = firstSongView(slideshow({ fadeInMs: 0, fadeOutMs: 5000 }), LISTENING);

    expect(view.fadeIn).toMatchObject({ ms: 0, own: true });
    expect(view.fadeOut).toMatchObject({ ms: 5000, own: true });
  });

  it("marks where the slide changes fall in the track, from the excerpt's start", () => {
    const view = firstSongView(slideshow({ trim: { startMs: 4000, endMs: 24_000 } }), LISTENING);

    expect(view.slideChanges.map((change) => change.atMs)).toEqual([9000, 14_000, 19_000]);
  });

  it("warns when the slideshow outlasts the excerpt, naming by how much", () => {
    const view = firstSongView(
      slideshow({ trim: { startMs: 0, endMs: 10_000 } }, [8000, undefined, undefined, undefined]),
      LISTENING,
    );

    expect(view.slideshowMs).toBe(14_000);
    expect(view.audibleEndMs).toBe(10_000);
    expect(view.note).toEqual({ kind: "outlasts", overMs: 4000, automaticCount: 3 });
  });

  it("with every picture timed and a shorter slideshow, ends the music with it", () => {
    const view = firstSongView(slideshow({}, [5000, 5000]), LISTENING);

    expect(view.audibleEndMs).toBe(10_000);
    expect(view.fadeOut).toEqual({ ms: 5000, own: false, reason: "slideshow-ends" });
    expect(view.note).toEqual({ kind: "ends-early", endsAtMs: 10_000 });
  });

  it("with every picture timed to the excerpt exactly, ends with the music", () => {
    const view = firstSongView(
      slideshow({ trim: { startMs: 0, endMs: 10_000 } }, [5000, 5000]),
      LISTENING,
    );

    expect(view.note).toEqual({ kind: "ends-with-music" });
  });

  it("counts every automatic picture sharing the music, a paired one included (ADR-0028)", () => {
    // Four portrait pictures, automatically paired two by two: a pair's duration is one slide's,
    // shown by both of its pictures (ADR-0028), so all four are automatic, not just two.
    const pictures: StoredPicture[] = [0, 1, 2, 3].map((index) => ({
      id: `p${index}`,
      capturedAt: "2025-07-01T10:00:00Z",
      width: 900,
      height: 1600,
      fileName: `p${index}.jpg`,
      colours: { veil: "#404040", accent: "#C0C0C0" },
    }));
    const stored: StoredSlideshow = {
      id: "show",
      title: "Sommer am See",
      createdAt: "2025-07-02T00:00:00Z",
      pictures,
      secondsPerPicture: 5,
      songs: [MUSIC],
    };

    const view = firstSongView(stored, LISTENING);

    expect(view.note).toEqual({
      kind: "shared",
      automaticCount: 4,
      shareMs: 102_000,
      onTheBeat: false,
    });
  });

  it("resolves the envelope the player plays", () => {
    const view = firstSongView(slideshow({ trim: { startMs: 12_000, endMs: 150_000 } }), LISTENING);

    expect(view.timing).toEqual({
      startMs: 12_000,
      endMs: 150_000,
      fadeInMs: 2000,
      fadeOutMs: 5000,
    });
  });

  describe("volume (ADR-0040)", () => {
    it("is still listening for the song's loudness until given", () => {
      const view = firstSongView(slideshow({}), LISTENING);

      expect(view.volume.measured).toBe(false);
      expect(view.volume.hint).toEqual({ kind: "measuring" });
    });

    it("levels the excerpt it plays, atop its own volume", () => {
      // One 400 ms gating block and the four 100 ms hops it spans, all one loudness, so the
      // whole-track excerpt [0, 400) feeds exactly these into excerptLoudnessLufs/excerptPeakDbfs.
      const loudness = {
        blockMeanSquares: new Float32Array([0.02]),
        hopPeaks: new Float32Array([0.6, 0.6, 0.6, 0.6]),
      };
      const view = firstSongView(slideshow({ durationMs: 400, volumeDb: 2 }), LISTENING, {
        kind: "known",
        loudness,
      });

      const lufs = excerptLoudnessLufs(loudness, 0, 400);
      const peakDbfs = excerptPeakDbfs(loudness, 0, 400);
      expect(lufs).not.toBeNull();
      expect(peakDbfs).not.toBeNull();
      expect(view.volume.measured).toBe(true);
      expect(view.volume.ownDb).toBe(2);
      expect(view.volume.levelDb).toBeCloseTo(MUSIC_TARGET_LOUDNESS_LUFS - (lufs as number), 5);
    });
  });
});
