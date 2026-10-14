import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { slideshowSummary } from "./library-views";

const COLOURS = { veil: "#404040", accent: "#C0C0C0" };
const stored: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-07-01T10:00:00Z",
      width: 300,
      height: 200,
      fileName: "a.jpg",
      colours: COLOURS,
    },
    {
      id: "p2",
      capturedAt: "2025-07-02T10:00:00Z",
      width: 300,
      height: 200,
      fileName: "b.jpg",
      colours: COLOURS,
    },
  ],
  songs: [],
  secondsPerPicture: 4,
};
const music = { id: "m", fileName: "Sommer.mp3", durationMs: 30_000, mimeType: "audio/mpeg" };
const withMusic: StoredSlideshow = { ...stored, songs: [music] };
const urlOf = (id: string) => `url:${id}`;

describe("slideshowSummary", () => {
  it("summarises a slideshow for its start card, covered by its first pictures", () => {
    expect(slideshowSummary(withMusic, urlOf)).toEqual({
      id: "show",
      title: "Juli 2025",
      coverUrls: ["url:p1", "url:p2"],
      pictureCount: 2,
      durationSeconds: 30,
      hasMusic: true,
    });
  });

  it("covers a start card with at most three pictures", () => {
    const morePictures: StoredSlideshow = {
      ...stored,
      pictures: ["p1", "p2", "p3", "p4"].map((id) => ({
        id,
        capturedAt: "2025-07-01T10:00:00Z",
        width: 300,
        height: 200,
        fileName: `${id}.jpg`,
        colours: COLOURS,
      })),
    };

    expect(slideshowSummary(morePictures, urlOf).coverUrls).toEqual(["url:p1", "url:p2", "url:p3"]);
  });
});
