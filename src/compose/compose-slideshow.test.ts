import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
import { pictureSlide } from "../player/testing/picture-slide";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { autoKenBurns } from "./auto-ken-burns";
import { NO_SONG_BEATS } from "./playlist";
import { NO_SONG_LOUDNESS } from "./song-loudness";

function picture(id: string, capturedAt: string): StoredPicture {
  return {
    id,
    capturedAt,
    fileName: `${id}.jpg`,
    width: 400,
    height: 300,
    colours: { veil: "#404040", accent: "#C0C0C0" },
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
    pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

describe("composeSlideshow", () => {
  it("keeps the stored picture order and title", () => {
    const stored = storedSlideshow();

    const result = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    );

    expect(result.title).toBe("July 2025");
    expect(result.slides.map((slide) => pictureSlide(slide).image.src)).toEqual([
      "pictures/a.jpg",
      "pictures/b.jpg",
    ]);
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

    const slides = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    ).slides;

    expect(pictureSlide(slides[1]).kenBurns).toEqual({ ...own, easing: "linear" });
    expect(pictureSlide(slides[0]).kenBurns).toEqual(
      pictureSlide(
        composeSlideshow(
          storedSlideshow(),
          sources,
          NO_FOCUS,
          NO_SONG_BEATS,
          NO_SONG_LOUDNESS,
          "en",
        ).slides[0],
      ).kenBurns,
    );
  });
});

describe("composeSlideshow with the pictures' focus", () => {
  it("aims an automatic motion at the picture's focus and leaves an own motion as it is", () => {
    const own = {
      from: { zoom: 3, centerX: 0.2, centerY: 0.8 },
      to: { zoom: 1.5, centerX: 0.6, centerY: 0.4 },
    };
    const [first, second] = storedSlideshow().pictures as [StoredPicture, StoredPicture];
    const stored = storedSlideshow({ pictures: [first, { ...second, kenBurns: own }] });
    const faces: PictureFocus = {
      kind: "subject",
      box: { x: 0.7, y: 0.1, width: 0.2, height: 0.2 },
      foundBy: "face",
    };
    const focus = new Map([
      ["a", faces],
      ["b", faces],
    ]);

    const slides = composeSlideshow(
      stored,
      sources,
      focus,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    ).slides;

    expect(pictureSlide(slides[0]).kenBurns).toEqual(autoKenBurns(0, first, faces));
    expect(pictureSlide(slides[0]).kenBurns).not.toEqual(autoKenBurns(0, first, undefined));
    expect(pictureSlide(slides[1]).kenBurns).toEqual({ ...own, easing: "linear" });
  });
});

describe("composeSlideshow with a caption", () => {
  it("carries a picture's caption onto its slide and gives the others none", () => {
    const [first, second] = storedSlideshow().pictures as [StoredPicture, StoredPicture];
    const stored = storedSlideshow({ pictures: [first, { ...second, caption: "Jetty" }] });

    const slides = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    ).slides;

    expect(pictureSlide(slides[1]).caption).toBe("Jetty");
    expect(slides[0]).toBeDefined();
    expect(slides[0]).not.toHaveProperty("caption");
  });
});
