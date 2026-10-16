import { describe, expect, it } from "vitest";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { currentPictureSpan } from "./current-picture-span";
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

describe("currentPictureSpan", () => {
  // A 4000–24000 ms excerpt, 4 pictures sharing it evenly: slide changes at 9000, 14000, 19000;
  // the run spans the excerpt exactly, 4000–24000.
  const trimmed = slideshow([song("a", 204_000, { trim: { startMs: 4000, endMs: 24_000 } })]);
  const view = musicEditorView(trimmed, NOTHING_KNOWN, "a");

  it("spans from the slide change before the position to the one after it", () => {
    expect(currentPictureSpan(view, 11_000)).toEqual({ startMs: 9000, endMs: 14_000 });
  });

  it("starts at the run's own start before the first change", () => {
    expect(currentPictureSpan(view, 6000)).toEqual({ startMs: 4000, endMs: 9000 });
  });

  it("ends at the run's own end after the last change", () => {
    expect(currentPictureSpan(view, 21_000)).toEqual({ startMs: 19_000, endMs: 24_000 });
  });

  it("is null outside the run", () => {
    expect(currentPictureSpan(view, 2000)).toBeNull();
    expect(currentPictureSpan(view, 25_000)).toBeNull();
  });

  it("is null while the slideshow never reaches the song", () => {
    const unreached = slideshow([song("a", 60_000), song("b", 60_000)], 2, {
      pictureLength: "seconds",
    });
    const second = musicEditorView(unreached, NOTHING_KNOWN, "b");

    expect(currentPictureSpan(second, 0)).toBeNull();
  });
});
