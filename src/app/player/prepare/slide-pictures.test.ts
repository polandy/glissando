import { describe, expect, it } from "vitest";
import { composeSlideshow } from "../../../compose";
import { NO_SONG_BEATS } from "../../../compose/playlist";
import { NO_SONG_LOUDNESS } from "../../../compose/song-loudness";
import type { PictureFocus } from "../../../library/picture-focus";
import type { StoredCard, StoredPicture, StoredSlideshow } from "../../../library/stored-slideshow";
import { picturePassedBySlide, slideOfPicture } from "./slide-pictures";

const LANDSCAPE = { width: 400, height: 300 };
const PORTRAIT = { width: 300, height: 400 };

function picture(id: string, size: { width: number; height: number }): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    ...size,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

/** As the player layer composes: a picture's source is its media id. */
const sources = {
  picture: (id: string) => id,
  music: (id: string) => id,
  video: (id: string) => id,
};
const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

function card(background: StoredCard["background"]): StoredCard {
  return {
    title: "Summer at the Lake",
    style: "modern",
    position: "centre",
    entrance: "rise",
    background,
    motion: false,
  };
}

const IDS = ["p1", "p2", "p3", "p4"];

/** The slides of p1, then p2 and p3 as a portrait pair, then p4. */
function composedSlides(overrides: Partial<StoredSlideshow>) {
  const stored: StoredSlideshow = {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [
      picture("p1", LANDSCAPE),
      picture("p2", PORTRAIT),
      picture("p3", PORTRAIT),
      picture("p4", LANDSCAPE),
    ],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
  return composeSlideshow(stored, sources, NO_FOCUS, NO_SONG_BEATS, NO_SONG_LOUDNESS, "en").slides;
}

function passedBySlide(overrides: Partial<StoredSlideshow>): readonly (string | null)[] {
  return picturePassedBySlide(composedSlides(overrides), IDS);
}

describe("picturePassedBySlide", () => {
  it("maps each slide to its own picture past a title card and a portrait pair", () => {
    const passed = passedBySlide({
      openingCard: card({ kind: "colour", colour: "plum" }),
    });

    expect(passed).toEqual([null, "p1", "p2", "p4"]);
  });

  it("passes no picture on a title card over a picture that plays later", () => {
    const passed = passedBySlide({
      openingCard: card({ kind: "picture", pictureId: "p4", fade: 60, tint: "picture" }),
    });

    expect(passed).toEqual([null, "p1", "p2", "p4"]);
  });

  it("passes no picture on a closing card over a picture that has played", () => {
    const passed = passedBySlide({
      closingCard: card({ kind: "picture", pictureId: "p1", fade: 60, tint: "picture" }),
    });

    expect(passed).toEqual(["p1", "p2", "p4", null]);
  });
});

describe("slideOfPicture", () => {
  it("finds each picture's own slide past a title card, a pair's partner on the pair", () => {
    const slides = composedSlides({ openingCard: card({ kind: "colour", colour: "plum" }) });

    expect(IDS.map((id) => slideOfPicture(slides, IDS, id))).toEqual([1, 2, 2, 3]);
  });

  it("finds a picture's own slide, not the title card shown over it", () => {
    const slides = composedSlides({
      openingCard: card({ kind: "picture", pictureId: "p4", fade: 60, tint: "picture" }),
    });

    expect(slideOfPicture(slides, IDS, "p4")).toBe(3);
  });

  it("finds no slide for a picture not played", () => {
    const slides = composedSlides({});

    expect(slideOfPicture(slides, IDS, "p1")).toBe(0);
    expect(slideOfPicture(slides, IDS, "gone")).toBe(-1);
  });
});
