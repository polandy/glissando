import { describe, expect, it } from "vitest";
import { autoKenBurns } from "../../compose";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { pictureEditorView } from "./picture-editor-view";

const own = {
  from: { zoom: 2, centerX: 0.3, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
};
const stored: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: [
    { id: "p1", capturedAt: "2025-07-01T10:00:00Z", width: 300, height: 200, fileName: "a.jpg" },
    {
      id: "p2",
      capturedAt: "2025-07-02T10:00:00Z",
      width: 300,
      height: 200,
      fileName: "b.jpg",
      kenBurns: own,
    },
    { id: "p3", capturedAt: "2025-07-03T10:00:00Z", width: 200, height: 300, fileName: "c.jpg" },
  ],
  secondsPerPicture: 4,
};

describe("pictureEditorView", () => {
  it("shows an automatic picture's motion for its position, its place and neighbours", () => {
    const automatic = autoKenBurns(0, stored.pictures[0] as StoredPicture);

    const view = pictureEditorView(stored, "p1");

    expect(view).toEqual({
      id: "p1",
      number: 1,
      count: 3,
      fileName: "a.jpg",
      capturedAt: "2025-07-01T10:00:00Z",
      size: { width: 300, height: 200 },
      motion: { from: automatic.from, to: automatic.to },
      ownMotion: false,
      durationMs: 4000,
      previousId: null,
      nextId: "p2",
    });
  });

  it("shows a picture's own motion", () => {
    const view = pictureEditorView(stored, "p2");

    expect(view.motion).toEqual(own);
    expect(view.ownMotion).toBe(true);
    expect([view.previousId, view.nextId]).toEqual(["p1", "p3"]);
  });

  it("plays the slide's real duration, as the music sets it", () => {
    const withMusic = {
      ...stored,
      music: { id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" },
    };

    expect(pictureEditorView(withMusic, "p3").durationMs).toBe(10_000);
  });

  it("refuses a picture the slideshow does not hold", () => {
    expect(() => pictureEditorView(stored, "gone")).toThrow(/gone/);
  });
});
