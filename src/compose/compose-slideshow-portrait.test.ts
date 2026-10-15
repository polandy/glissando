import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
import { parseSlideshow } from "../player/parse-slideshow";
import { pictureSlide } from "../player/testing/picture-slide";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { NO_SONG_BEATS } from "./playlist";

function portrait(id: string, overrides: Partial<StoredPicture> = {}): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    width: 300,
    height: 400,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    ...overrides,
  };
}

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
  video: (id: string) => `videos/${id}.mp4`,
};

const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [portrait("a"), portrait("b")],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

describe("composeSlideshow with portrait pictures (ADR-0028)", () => {
  it("composes two consecutive portrait pictures into one slide, by default", () => {
    const result = composeSlideshow(storedSlideshow(), sources, NO_FOCUS, NO_SONG_BEATS);

    expect(result.slides).toHaveLength(1);
    expect(pictureSlide(result.slides[0]).image.src).toBe("pictures/a.jpg");
    expect(pictureSlide(result.slides[0]).partner?.image.src).toBe("pictures/b.jpg");
  });

  it("gives the pair 1.5 times a single slide's seconds", () => {
    const result = composeSlideshow(storedSlideshow(), sources, NO_FOCUS, NO_SONG_BEATS);

    expect(pictureSlide(result.slides[0]).durationMs).toBe(7500);
  });

  it("gives each half its own automatic motion with no horizontal pan", () => {
    const result = composeSlideshow(storedSlideshow(), sources, NO_FOCUS, NO_SONG_BEATS);
    const slide = pictureSlide(result.slides[0]);

    expect(slide.kenBurns.from.centerX).toBe(slide.kenBurns.to.centerX);
    expect(slide.partner?.kenBurns.from.centerX).toBe(slide.partner?.kenBurns.to.centerX);
  });

  it("round-trips through parseSlideshow unchanged", () => {
    const result = composeSlideshow(storedSlideshow(), sources, NO_FOCUS, NO_SONG_BEATS);

    expect(parseSlideshow(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });

  it("composes no pair when the slideshow is one-at-a-time", () => {
    const stored = storedSlideshow({ portraitPictures: "one-at-a-time" });

    const result = composeSlideshow(stored, sources, NO_FOCUS, NO_SONG_BEATS);

    expect(result.slides).toHaveLength(2);
    expect(result.slides[0]).not.toHaveProperty("partner");
  });

  it("gives every slide fit cover when the slideshow is fill-screen", () => {
    const stored = storedSlideshow({ portraitPictures: "fill-screen" });

    const result = composeSlideshow(stored, sources, NO_FOCUS, NO_SONG_BEATS);

    expect(result.slides.every((slide) => pictureSlide(slide).fit === "cover")).toBe(true);
    expect(result.slides[0]).not.toHaveProperty("partner");
  });

  it("omits fit when the layout is automatic", () => {
    const result = composeSlideshow(storedSlideshow(), sources, NO_FOCUS, NO_SONG_BEATS);

    expect(result.slides[0]).not.toHaveProperty("fit");
  });

  it("keeps a picture marked alone single, pairing none of its neighbours with it", () => {
    const stored = storedSlideshow({
      pictures: [portrait("a", { alone: true }), portrait("b"), portrait("c")],
    });

    const result = composeSlideshow(stored, sources, NO_FOCUS, NO_SONG_BEATS);

    expect(result.slides).toHaveLength(2);
    expect(result.slides[0]).not.toHaveProperty("partner");
    expect(pictureSlide(result.slides[1]).partner?.image.src).toBe("pictures/c.jpg");
  });
});
