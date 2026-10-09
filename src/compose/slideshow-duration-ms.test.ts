import { describe, expect, it } from "vitest";
import { slideshowDurationMs } from "./slideshow-duration-ms";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";

function picture(id: string, capturedAt: string): StoredPicture {
  return { id, capturedAt, fileName: `${id}.jpg`, width: 400, height: 300 };
}

describe("slideshowDurationMs", () => {
  it("sums the slide durations without music", () => {
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
      secondsPerPicture: 5,
    };

    expect(slideshowDurationMs(stored)).toBe(10_000);
  });

  it("matches the music length exactly", () => {
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [
        picture("a", "2025-07-01T10:00:00Z"),
        picture("b", "2025-07-02T10:00:00Z"),
        picture("c", "2025-07-03T10:00:00Z"),
      ],
      music: { id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" },
      secondsPerPicture: 5,
    };

    expect(slideshowDurationMs(stored)).toBe(10_000);
  });

  it("follows the own durations: the automatic pictures share the rest of the music", () => {
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [
        { ...picture("a", "2025-07-01T10:00:00Z"), durationMs: 15_000 },
        picture("b", "2025-07-02T10:00:00Z"),
      ],
      music: { id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" },
      secondsPerPicture: 5,
    };

    expect(slideshowDurationMs(stored)).toBe(17_000);
  });
});
