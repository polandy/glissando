import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
import { parseSlideshow } from "../player/parse-slideshow";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";

function picture(id: string, capturedAt: string): StoredPicture {
  return { id, capturedAt, fileName: `${id}.jpg`, width: 400, height: 300 };
}

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
};

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
    secondsPerPicture: 5,
    ...overrides,
  };
}

describe("composeSlideshow", () => {
  it("keeps the stored picture order and title", () => {
    const stored = storedSlideshow();

    const result = composeSlideshow(stored, sources);

    expect(result.title).toBe("July 2025");
    expect(result.slides.map((slide) => slide.image.src)).toEqual([
      "pictures/a.jpg",
      "pictures/b.jpg",
    ]);
  });

  it("includes music when the stored slideshow has it", () => {
    const stored = storedSlideshow({
      music: { id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" },
    });

    const result = composeSlideshow(stored, sources);

    expect(result.music).toEqual({ src: "music/m1.mp3" });
  });

  it("omits music when the stored slideshow has none", () => {
    const result = composeSlideshow(storedSlideshow(), sources);

    expect(result.music).toBeUndefined();
    expect("music" in result).toBe(false);
  });

  it("produces a slideshow that parseSlideshow accepts unchanged, for an even music split", () => {
    const stored = storedSlideshow({
      pictures: [
        picture("a", "2025-07-01T10:00:00Z"),
        picture("b", "2025-07-02T10:00:00Z"),
        picture("c", "2025-07-03T10:00:00Z"),
        picture("d", "2025-07-04T10:00:00Z"),
      ],
      music: { id: "m1", fileName: "song.mp3", durationMs: 8000, mimeType: "audio/mpeg" },
    });

    const result = composeSlideshow(stored, sources);
    const roundTripped = parseSlideshow(JSON.parse(JSON.stringify(result)));

    expect(roundTripped).toEqual(result);
    const total = result.slides.reduce((sum, slide) => sum + slide.durationMs, 0);
    expect(total).toBe(8000);
  });

  it("produces a slideshow that parseSlideshow accepts unchanged, for an uneven music split", () => {
    const stored = storedSlideshow({
      pictures: [
        picture("a", "2025-07-01T10:00:00Z"),
        picture("b", "2025-07-02T10:00:00Z"),
        picture("c", "2025-07-03T10:00:00Z"),
      ],
      music: { id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" },
    });

    const result = composeSlideshow(stored, sources);
    const roundTripped = parseSlideshow(JSON.parse(JSON.stringify(result)));

    expect(roundTripped).toEqual(result);
    const total = result.slides.reduce((sum, slide) => sum + slide.durationMs, 0);
    expect(total).toBe(10_000);
  });
});
