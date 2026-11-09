import { describe, expect, it } from "vitest";
import { SEQUENCE_BETWEEN_SONGS } from "../../library/own-music";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { musicEditorView } from "./music-editor-view";

const NOTHING_KNOWN = new Map();

function song(id: string, durationMs: number, own: Partial<StoredMusic> = {}): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs, mimeType: "audio/mpeg", ...own };
}

/** `count` pictures filling the playlist `songs`. */
function slideshow(songs: StoredMusic[], count = 4, own: Partial<StoredSlideshow> = {}) {
  const pictures: StoredPicture[] = Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `p${index}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  }));
  return {
    id: "show",
    title: "Sommer",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    songs,
    ...own,
  } satisfies StoredSlideshow;
}

describe("musicEditorView of one song of a playlist (ADR-0023)", () => {
  it("numbers the song and crossfades it from the previous one and into the next", () => {
    const stored = slideshow([song("a", 60_000), song("b", 60_000), song("c", 60_000)]);

    expect(musicEditorView(stored, NOTHING_KNOWN, "b")).toMatchObject({
      songNumber: 2,
      fileName: "b.mp3",
      reached: true,
      fadeIn: { ms: 3000, own: false, reason: "crossfade-from-previous" },
      fadeOut: { ms: 3000, own: false, reason: "crossfade-into-next" },
      timing: { startMs: 0, endMs: 60_000, fadeInMs: 3000, fadeOutMs: 3000 },
    });
  });

  it("gives each song its own automatic fades one after another", () => {
    const stored = slideshow([song("a", 60_000), song("b", 60_000)], 4, {
      betweenSongs: SEQUENCE_BETWEEN_SONGS,
    });

    expect(musicEditorView(stored, NOTHING_KNOWN, "b")).toMatchObject({
      fadeIn: { ms: 0, reason: "track-starts" },
      fadeOut: { ms: 0, reason: "track-ends" },
    });
  });

  it("shares the whole playlist among the pictures, the slide changes in the song's own time", () => {
    // 60 s + 60 s less a 3 s crossfade: 117 s over 3 pictures, a change every 39 s.
    const stored = slideshow([song("a", 60_000), song("b", 60_000)], 3);

    const view = musicEditorView(stored, NOTHING_KNOWN, "b");

    expect(view.slideshowMs).toBe(117_000);
    expect(view.slideChanges).toEqual([{ atMs: 21_000, offBeat: false }]);
  });

  it("marks a song the slideshow ends before as not reached", () => {
    const stored = slideshow([song("a", 60_000), song("b", 60_000)], 2, {
      pictureLength: "seconds",
    });

    expect(musicEditorView(stored, NOTHING_KNOWN, "b").reached).toBe(false);
    expect(musicEditorView(stored, NOTHING_KNOWN, "a")).toMatchObject({
      reached: true,
      audibleEndMs: 10_000,
      fadeOut: { reason: "slideshow-ends", ms: 5000 },
    });
  });

  it("refuses a song the slideshow does not play", () => {
    expect(() => musicEditorView(slideshow([song("a", 60_000)]), NOTHING_KNOWN, "x")).toThrow(
      /no song "x"/,
    );
  });
});
