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

    expect(result.music).toEqual({
      src: "music/m1.mp3",
      startMs: 0,
      endMs: 10_000,
      fadeInMs: 0,
      fadeOutMs: 0,
    });
  });

  it("plays the music's excerpt with its fades, resolved, and times the slides to it", () => {
    const stored = storedSlideshow({
      music: {
        id: "m1",
        fileName: "song.mp3",
        durationMs: 60_000,
        mimeType: "audio/mpeg",
        trim: { startMs: 12_000, endMs: 22_000 },
        fadeOutMs: 5000,
      },
    });

    const result = composeSlideshow(stored, sources);

    expect(result.music).toEqual({
      src: "music/m1.mp3",
      startMs: 12_000,
      endMs: 22_000,
      fadeInMs: 2000,
      fadeOutMs: 5000,
    });
    expect(result.slides.map((slide) => slide.durationMs)).toEqual([5000, 5000]);
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

describe("composeSlideshow with an own motion", () => {
  it("plays a picture's own motion and the automatic one for the others", () => {
    const own = {
      from: { zoom: 3, centerX: 0.2, centerY: 0.8 },
      to: { zoom: 1.5, centerX: 0.6, centerY: 0.4 },
    };
    const [first, second] = storedSlideshow().pictures as [StoredPicture, StoredPicture];
    const stored = storedSlideshow({ pictures: [first, { ...second, kenBurns: own }] });

    const slides = composeSlideshow(stored, sources).slides;

    expect(slides[1]?.kenBurns).toEqual({ ...own, easing: "linear" });
    expect(slides[0]?.kenBurns).toEqual(
      composeSlideshow(storedSlideshow(), sources).slides[0]?.kenBurns,
    );
  });
});

describe("composeSlideshow with a caption", () => {
  it("carries a picture's caption onto its slide and gives the others none", () => {
    const [first, second] = storedSlideshow().pictures as [StoredPicture, StoredPicture];
    const stored = storedSlideshow({ pictures: [first, { ...second, caption: "Jetty" }] });

    const slides = composeSlideshow(stored, sources).slides;

    expect(slides[1]?.caption).toBe("Jetty");
    expect(slides[0]).toBeDefined();
    expect(slides[0]).not.toHaveProperty("caption");
  });
});

describe("composeSlideshow with an own duration and transition", () => {
  it("plays the own duration and the own effect, at the length that duration gives", () => {
    const [first, second] = storedSlideshow().pictures as [StoredPicture, StoredPicture];
    const stored = storedSlideshow({
      pictures: [{ ...first, durationMs: 2000, transition: "dissolve" }, second],
    });

    const [slide] = composeSlideshow(stored, sources).slides;

    expect(slide?.durationMs).toBe(2000);
    expect(slide?.transitionToNext).toEqual({ effect: "dissolve", durationMs: 600 });
  });

  it("composes a cut as a slide without transitionToNext, which the player accepts", () => {
    const [first, second] = storedSlideshow().pictures as [StoredPicture, StoredPicture];
    const stored = storedSlideshow({ pictures: [{ ...first, transition: "cut" }, second] });

    const composed = composeSlideshow(stored, sources);

    expect(composed.slides[0]?.durationMs).toBe(5000);
    expect(composed.slides[0]).not.toHaveProperty("transitionToNext");
    expect(() => parseSlideshow(composed)).not.toThrow();
  });
});
