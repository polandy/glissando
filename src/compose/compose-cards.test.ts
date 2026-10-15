import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import type {
  CardTint,
  StoredCard,
  StoredPicture,
  StoredSlideshow,
} from "../library/stored-slideshow";
import { CARD_SWATCHES } from "../player/card-palette";
import { isGroundSlide, type GroundSlide } from "../player/slideshow";
import { pictureSlide } from "../player/testing/picture-slide";
import { CARD_ALONE_MS, CARD_END_FADE_MS, CARD_SLIDE_MS } from "./compose-cards";
import { composeSlideshow } from "./compose-slideshow";
import { NO_SONG_BEATS } from "./playlist";

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
// No beats: the nominal values apply directly (TITLE_CARDS.md § Composition, Beats).
const REVEAL_AT_MS = 2500;
const LEAD_MS = REVEAL_AT_MS + 1400;

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [
      picture("p1", "2025-07-01T10:00:00Z"),
      picture("p2", "2025-07-02T10:00:00Z"),
      picture("p3", "2025-07-03T10:00:00Z"),
    ],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

const COLOUR_CARD: StoredCard = {
  title: "Summer at the Lake",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "colour", colour: "plum" },
  motion: true,
};

function pictureCard(pictureId: string, motion: boolean, tint: CardTint = "picture"): StoredCard {
  return {
    title: "Summer at the Lake",
    style: "modern",
    position: "centre",
    entrance: "rise",
    background: { kind: "picture", pictureId, fade: 60, tint },
    motion,
  };
}

function compose(stored: StoredSlideshow) {
  return composeSlideshow(stored, sources, NO_FOCUS, NO_SONG_BEATS);
}

function ground(slide: unknown): GroundSlide {
  if (!isGroundSlide(slide as never)) {
    throw new Error("expected a ground slide");
  }
  return slide as GroundSlide;
}

describe("composeCards, opening card", () => {
  it("skips the card entirely while its title is empty", () => {
    const stored = storedSlideshow({ openingCard: { ...COLOUR_CARD, title: "" } });
    expect(compose(stored).slides).toHaveLength(3);
  });

  it("becomes a ground slide of CARD_SLIDE_MS on a colour background", () => {
    const stored = storedSlideshow({ openingCard: COLOUR_CARD });
    const result = compose(stored);
    expect(result.slides).toHaveLength(4);
    const first = ground(result.slides[0]);
    expect(first.ground).toBe(CARD_SWATCHES.plum);
    expect(first.durationMs).toBe(CARD_SLIDE_MS);
    expect(first.card).toMatchObject({ title: "Summer at the Lake", ink: "light" });
    expect(first.card).not.toHaveProperty("veil");
    expect(first.transitionToNext).toMatchObject({ effect: "crossfade" });
  });

  it("without reveal, inserts a dedicated slide of CARD_SLIDE_MS over the picture", () => {
    const stored = storedSlideshow({ openingCard: pictureCard("p2", false) });
    const result = compose(stored);
    expect(result.slides).toHaveLength(4);
    const first = pictureSlide(result.slides[0]);
    expect(first.image.src).toBe("pictures/p2.jpg");
    expect(first.durationMs).toBe(CARD_SLIDE_MS);
    // tint "picture": the veil is the background picture's own colour, not a fixed swatch.
    expect(first.card).toMatchObject({ veil: { amount: 0.6, tint: "#404040" } });
    expect(first.card).not.toHaveProperty("revealAtMs");
    // The picture still plays again in its own place, unchanged.
    expect(pictureSlide(result.slides[2]).image.src).toBe("pictures/p2.jpg");
  });

  it("with reveal on the first picture, extends that slide instead of adding one", () => {
    const stored = storedSlideshow({ openingCard: pictureCard("p1", true) });
    const result = compose(stored);
    expect(result.slides).toHaveLength(3);
    const first = pictureSlide(result.slides[0]);
    expect(first.image.src).toBe("pictures/p1.jpg");
    expect(first.durationMs).toBe(5000 + LEAD_MS);
    expect(first.card).toMatchObject({ revealAtMs: REVEAL_AT_MS });
  });

  it("with reveal on a later picture, inserts a lead slide of lead + CARD_ALONE_MS", () => {
    const stored = storedSlideshow({ openingCard: pictureCard("p2", true) });
    const result = compose(stored);
    expect(result.slides).toHaveLength(4);
    const first = pictureSlide(result.slides[0]);
    expect(first.image.src).toBe("pictures/p2.jpg");
    expect(first.durationMs).toBe(LEAD_MS + CARD_ALONE_MS);
    expect(first.card).toMatchObject({ revealAtMs: REVEAL_AT_MS });
    expect(pictureSlide(result.slides[2]).image.src).toBe("pictures/p2.jpg");
  });
});

describe("composeCards, closing card", () => {
  it("skips the card entirely while its title is empty", () => {
    const stored = storedSlideshow({ closingCard: { ...COLOUR_CARD, title: "" } });
    const result = compose(stored);
    expect(result.slides).toHaveLength(3);
    expect(result.endFadeMs).toBeUndefined();
  });

  it("becomes a ground slide of CARD_SLIDE_MS + CARD_END_FADE_MS on a colour background", () => {
    const stored = storedSlideshow({ closingCard: COLOUR_CARD });
    const result = compose(stored);
    expect(result.slides).toHaveLength(4);
    const last = ground(result.slides.at(-1));
    expect(last.durationMs).toBe(CARD_SLIDE_MS + CARD_END_FADE_MS);
    expect(result.endFadeMs).toBe(CARD_END_FADE_MS);
    // The slide that was last now hands over to the new one instead of cutting.
    expect(pictureSlide(result.slides[2]).transitionToNext).toMatchObject({ effect: "crossfade" });
  });

  it("fade in on, on the last picture, extends that slide and enters after its own duration", () => {
    const stored = storedSlideshow({ closingCard: pictureCard("p3", true) });
    const result = compose(stored);
    expect(result.slides).toHaveLength(3);
    const last = pictureSlide(result.slides.at(-1));
    expect(last.durationMs).toBe(5000 + CARD_SLIDE_MS + CARD_END_FADE_MS);
    expect(last.card).toMatchObject({ enterAtMs: 5000 });
    expect(result.endFadeMs).toBe(CARD_END_FADE_MS);
  });

  it("fade in on, on an earlier picture, appends a slide entering after CARD_ALONE_MS", () => {
    const stored = storedSlideshow({ closingCard: pictureCard("p2", true) });
    const result = compose(stored);
    expect(result.slides).toHaveLength(4);
    const last = pictureSlide(result.slides.at(-1));
    expect(last.image.src).toBe("pictures/p2.jpg");
    expect(last.durationMs).toBe(CARD_ALONE_MS + CARD_SLIDE_MS + CARD_END_FADE_MS);
    expect(last.card).toMatchObject({ enterAtMs: CARD_ALONE_MS });
    expect(pictureSlide(result.slides[2]).transitionToNext).toMatchObject({ effect: "crossfade" });
  });

  it("fade in off, the veil and the text are there from the slide's start", () => {
    const stored = storedSlideshow({ closingCard: pictureCard("p3", false) });
    const result = compose(stored);
    const last = pictureSlide(result.slides.at(-1));
    expect(last.card).toMatchObject({ enterAtMs: 0 });
  });
});

describe("composeCards, ink", () => {
  it("is dark on a light ground swatch", () => {
    const stored = storedSlideshow({
      openingCard: { ...COLOUR_CARD, background: { kind: "colour", colour: "cream" } },
    });
    const first = ground(compose(stored).slides[0]);
    expect(first.card.ink).toBe("dark");
  });

  it("is dark on a light hex ground colour", () => {
    const stored = storedSlideshow({
      openingCard: { ...COLOUR_CARD, background: { kind: "colour", colour: "#F5F0E8" } },
    });
    const first = ground(compose(stored).slides[0]);
    expect(first.ground).toBe("#F5F0E8");
    expect(first.card.ink).toBe("dark");
  });

  it("is light on the picture's own dark veil tint", () => {
    const stored = storedSlideshow({ openingCard: pictureCard("p1", false, "picture") });
    const first = pictureSlide(compose(stored).slides[0]);
    expect(first.card?.ink).toBe("light");
  });
});

describe("composeCards, tint", () => {
  it("tint picture: the veil is the background picture's own colour", () => {
    const stored = storedSlideshow({ openingCard: pictureCard("p1", false, "picture") });
    const first = pictureSlide(compose(stored).slides[0]);
    expect(first.card).toMatchObject({ veil: { amount: 0.6, tint: "#404040" } });
  });

  it("tint light: the veil is the fixed cream, not the picture's colour", () => {
    const stored = storedSlideshow({ openingCard: pictureCard("p1", false, "light") });
    const first = pictureSlide(compose(stored).slides[0]);
    expect(first.card).toMatchObject({ veil: { amount: 0.6, tint: CARD_SWATCHES.cream } });
  });

  it("tint dark: the veil is the fixed plum, not the picture's colour", () => {
    const stored = storedSlideshow({ openingCard: pictureCard("p1", false, "dark") });
    const first = pictureSlide(compose(stored).slides[0]);
    expect(first.card).toMatchObject({ veil: { amount: 0.6, tint: CARD_SWATCHES.plum } });
  });
});

describe("composeCards, music", () => {
  it("floors the last track's fade-out at the closing card's endFadeMs", () => {
    const stored = storedSlideshow({
      songs: [{ id: "m1", fileName: "song.mp3", durationMs: 30_000, mimeType: "audio/mpeg" }],
      closingCard: COLOUR_CARD,
    });
    const result = compose(stored);
    const slideshowMs = result.slides.reduce((sum, slide) => sum + slide.durationMs, 0);
    const track = result.music?.[0];
    expect(track).toBeDefined();
    expect(track?.fadeOutMs).toBeGreaterThanOrEqual(CARD_END_FADE_MS);
    expect((track?.atMs ?? 0) + (track?.endMs ?? 0) - (track?.startMs ?? 0)).toBeLessThanOrEqual(
      slideshowMs,
    );
  });
});
