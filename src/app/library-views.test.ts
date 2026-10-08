import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { slideshowDetails, slideshowSummary } from "./library-views";

const stored: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: [
    { id: "p1", capturedAt: "2025-07-01T10:00:00Z", width: 300, height: 200, fileName: "a.jpg" },
    { id: "p2", capturedAt: "2025-07-02T10:00:00Z", width: 300, height: 200, fileName: "b.jpg" },
  ],
  secondsPerPicture: 4,
};
const withMusic: StoredSlideshow = {
  ...stored,
  music: { id: "m", fileName: "Sommer.mp3", durationMs: 30_000, mimeType: "audio/mpeg" },
};
const urlOf = (id: string) => `url:${id}`;

describe("slideshowSummary", () => {
  it("summarises a slideshow for its start card, covered by the first picture", () => {
    expect(slideshowSummary(withMusic, urlOf)).toEqual({
      id: "show",
      title: "Juli 2025",
      coverUrl: "url:p1",
      pictureCount: 2,
      durationSeconds: 30,
      hasMusic: true,
    });
  });
});

describe("slideshowDetails", () => {
  it("lists the pictures in play order with their thumbnails", () => {
    expect(slideshowDetails(stored, urlOf)).toEqual({
      title: "Juli 2025",
      coverUrl: "url:p1",
      durationSeconds: 8,
      musicTitle: null,
      pictures: [
        { id: "p1", thumbnailUrl: "url:p1", capturedAt: "2025-07-01T10:00:00Z" },
        { id: "p2", thumbnailUrl: "url:p2", capturedAt: "2025-07-02T10:00:00Z" },
      ],
    });
  });

  it("names the music by its file name", () => {
    expect(slideshowDetails(withMusic, urlOf).musicTitle).toBe("Sommer.mp3");
  });
});
