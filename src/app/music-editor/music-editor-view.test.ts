import { describe, expect, it } from "vitest";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { musicEditorView } from "./music-editor-view";

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
    ...(durationMs === undefined ? {} : { durationMs }),
  }));
  return {
    id: "show",
    title: "Sommer am See",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    music: { ...MUSIC, ...music },
  };
}

describe("musicEditorView", () => {
  it("shows the whole track, automatic fades off, with the pictures sharing it", () => {
    const view = musicEditorView(slideshow({}));

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
    const view = musicEditorView(slideshow({ trim: { startMs: 12_000, endMs: 150_000 } }));

    expect(view.trimmed).toBe(true);
    expect(view.fadeIn).toEqual({ ms: 2000, own: false, reason: "excerpt-starts-mid-track" });
    expect(view.fadeOut).toEqual({ ms: 2000, own: false, reason: "excerpt-ends-early" });
  });

  it("shows own fades as own, 0 included", () => {
    const view = musicEditorView(slideshow({ fadeInMs: 0, fadeOutMs: 5000 }));

    expect(view.fadeIn).toMatchObject({ ms: 0, own: true });
    expect(view.fadeOut).toMatchObject({ ms: 5000, own: true });
  });

  it("marks where the slide changes fall in the track, from the excerpt's start", () => {
    const view = musicEditorView(slideshow({ trim: { startMs: 4000, endMs: 24_000 } }));

    expect(view.slideChangesMs).toEqual([9000, 14_000, 19_000]);
  });

  it("warns when the slideshow outlasts the excerpt, naming by how much", () => {
    const view = musicEditorView(
      slideshow({ trim: { startMs: 0, endMs: 10_000 } }, [8000, undefined, undefined, undefined]),
    );

    expect(view.slideshowMs).toBe(14_000);
    expect(view.audibleEndMs).toBe(10_000);
    expect(view.note).toEqual({ kind: "outlasts", overMs: 4000, automaticCount: 3 });
  });

  it("with every picture timed and a shorter slideshow, ends the music with it", () => {
    const view = musicEditorView(slideshow({}, [5000, 5000]));

    expect(view.audibleEndMs).toBe(10_000);
    expect(view.fadeOut).toEqual({ ms: 2000, own: false, reason: "slideshow-ends" });
    expect(view.note).toEqual({ kind: "ends-early", endsAtMs: 10_000 });
  });

  it("with every picture timed to the excerpt exactly, ends with the music", () => {
    const view = musicEditorView(slideshow({ trim: { startMs: 0, endMs: 10_000 } }, [5000, 5000]));

    expect(view.note).toEqual({ kind: "ends-with-music" });
  });

  it("resolves the envelope the player plays", () => {
    const view = musicEditorView(slideshow({ trim: { startMs: 12_000, endMs: 150_000 } }));

    expect(view.timing).toEqual({
      startMs: 12_000,
      endMs: 150_000,
      fadeInMs: 2000,
      fadeOutMs: 2000,
    });
  });
});
