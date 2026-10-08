import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { exportMediaKey, exportMenuState } from "./export-menu";

describe("exportMenuState", () => {
  it("offers the export with the measured size while none runs", () => {
    expect(exportMenuState(null, "a", 1000)).toEqual({ kind: "idle", sizeBytes: 1000 });
  });

  it("shows this slideshow's export running with its progress", () => {
    const running = { slideshowId: "a", title: "A", fraction: 0.5 };
    expect(exportMenuState(running, "a", null)).toEqual({ kind: "this", fraction: 0.5 });
  });

  it("waits while another slideshow exports", () => {
    const running = { slideshowId: "b", title: "B", fraction: 0.5 };
    expect(exportMenuState(running, "a", 1000)).toEqual({ kind: "other" });
  });
});

describe("exportMediaKey", () => {
  const slideshow: StoredSlideshow = {
    id: "s",
    title: "Juli",
    createdAt: "2025-07-01T10:00:00.000Z",
    pictures: [
      { id: "p1", capturedAt: "2025-07-01T10:00:00.000Z", width: 4, height: 3, fileName: "a.jpg" },
      { id: "p2", capturedAt: "2025-07-01T10:00:00.000Z", width: 4, height: 3, fileName: "b.jpg" },
    ],
    music: { id: "m", fileName: "song.mp3", durationMs: 1000, mimeType: "audio/mpeg" },
    secondsPerPicture: 5,
  };

  it("stays the same when only the title changes, so the size is not measured again", () => {
    expect(exportMediaKey({ ...slideshow, title: "August" })).toBe(exportMediaKey(slideshow));
  });

  it("changes when a picture is removed, so the size is measured again", () => {
    const removed = { ...slideshow, pictures: slideshow.pictures.slice(1) };
    expect(exportMediaKey(removed)).not.toBe(exportMediaKey(slideshow));
  });

  it("changes when the music is removed", () => {
    const { id, title, createdAt, pictures, secondsPerPicture } = slideshow;
    const withoutMusic = { id, title, createdAt, pictures, secondsPerPicture };
    expect(exportMediaKey(withoutMusic)).not.toBe(exportMediaKey(slideshow));
  });
});
