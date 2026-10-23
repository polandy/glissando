import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import { DEFAULT_SLIDESHOW_TRANSITION } from "../library/own-timing";
import type { StoredPicture } from "../library/stored-slideshow";
import { CARD_REVEAL_MS } from "../player/card-timing";
import { isGroundSlide, type KenBurns, type PictureSlide, type Slide } from "../player/slideshow";
import { CHAPTER_SLIDE_MS, composeChapters, type ComposedChapter } from "./compose-chapters";
import type { PictureSource } from "./card-slide";

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 400,
    height: 300,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

const KEN_BURNS: KenBurns = {
  from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  to: { zoom: 1.2, centerX: 0.6, centerY: 0.4 },
  easing: "linear",
};

function plainSlide(pictureId: string, durationMs = 5000): PictureSlide {
  return {
    image: { src: `pictures/${pictureId}.jpg`, capturedAt: "2025-07-01T10:00:00Z" },
    durationMs,
    kenBurns: KEN_BURNS,
  };
}

function pairSlide(firstPictureId: string, secondPictureId: string): PictureSlide {
  return {
    ...plainSlide(firstPictureId),
    partner: {
      image: { src: `pictures/${secondPictureId}.jpg`, capturedAt: "2025-07-01T10:00:00Z" },
      kenBurns: KEN_BURNS,
    },
  };
}

function videoSlide(pictureId: string, durationMs: number): PictureSlide {
  return {
    ...plainSlide(pictureId, durationMs),
    video: { src: `videos/${pictureId}.mp4`, startMs: 0, endMs: durationMs, volume: 1 },
  };
}

const sources: PictureSource = { picture: (id) => `pictures/${id}.jpg` };
const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

function pictureSlideOf(slide: Slide | undefined): PictureSlide {
  if (slide === undefined || isGroundSlide(slide)) {
    throw new Error("expected a picture slide");
  }
  return slide;
}

describe("composeChapters", () => {
  const pictures = [picture("p1"), picture("p2"), picture("p3")];
  const slides = [plainSlide("p1"), plainSlide("p2"), plainSlide("p3")];
  const chapter: ComposedChapter = { anchorPictureId: "p2", title: "Porto", subtitle: "Day 2" };

  it("carries the chapter on the anchor's own slide instead of inserting a separate one", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      slides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(composed).toHaveLength(3);
    expect(pictureSlideOf(composed[1]).image.src).toBe("pictures/p2.jpg");
    expect(pictureSlideOf(composed[1]).card).toMatchObject({ title: "Porto", subtitle: "Day 2" });
  });

  it("keeps the anchor's own Ken Burns motion, unchanged by the chapter", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      slides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(pictureSlideOf(composed[1]).kenBurns).toEqual(KEN_BURNS);
  });

  it("lengthens the anchor's own duration by the fixed chapter time, on top of its own", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      [plainSlide("p1"), plainSlide("p2", 9000), plainSlide("p3")],
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(pictureSlideOf(composed[1]).durationMs).toBe(9000 + CHAPTER_SLIDE_MS);
    expect(CHAPTER_SLIDE_MS).toBe(3000);
  });

  it("reveals the card so the veil and text are gone once the chapter time has elapsed", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      slides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(pictureSlideOf(composed[1]).card).toMatchObject({
      revealAtMs: CHAPTER_SLIDE_MS - CARD_REVEAL_MS,
    });
  });

  it("builds a quiet, bottom-left card with a picture veil and matching ink", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      slides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(pictureSlideOf(composed[1]).card).toMatchObject({
      style: "quiet",
      position: "bottom-left",
      entrance: "slow-fade",
      ink: "light",
      veil: { amount: 0.6, tint: "#404040" },
    });
  });

  it("leaves the other slides and their own durations untouched", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      slides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(pictureSlideOf(composed[0]).durationMs).toBe(5000);
    expect(pictureSlideOf(composed[0]).card).toBeUndefined();
    expect(pictureSlideOf(composed[2]).durationMs).toBe(5000);
    expect(pictureSlideOf(composed[2]).card).toBeUndefined();
  });

  it("composes several chapters, each carried by its own anchor", () => {
    const chapters: readonly ComposedChapter[] = [
      { anchorPictureId: "p2", title: "Porto", subtitle: "Day 2" },
      { anchorPictureId: "p3", title: "Sintra", subtitle: "Day 3" },
    ];

    const composed = composeChapters(
      chapters,
      pictures,
      slides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(composed).toHaveLength(3);
    const titles = composed.map((slide) => (isGroundSlide(slide) ? undefined : slide.card?.title));
    expect(titles).toEqual([undefined, "Porto", "Sintra"]);
  });

  it("finds the anchor picture's slide by its image, unaffected by an opening card's lead slide", () => {
    const withLeadSlide = [plainSlide("p1"), plainSlide("p1"), plainSlide("p2"), plainSlide("p3")];

    const composed = composeChapters(
      [chapter],
      pictures,
      withLeadSlide,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(composed).toHaveLength(4);
    expect(pictureSlideOf(composed[2]).card?.title).toBe("Porto");
    expect(pictureSlideOf(composed[2]).image.src).toBe("pictures/p2.jpg");
  });

  it("falls back to a dedicated slide of its own when the anchor is a portrait pair's second picture", () => {
    const pairedSlides = [pairSlide("p1", "p2"), plainSlide("p3")];
    const pairedChapter: ComposedChapter = {
      anchorPictureId: "p2",
      title: "Porto",
      subtitle: "Day 2",
    };

    const composed = composeChapters(
      [pairedChapter],
      pictures,
      pairedSlides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(composed).toHaveLength(3);
    const dedicated = pictureSlideOf(composed[0]);
    expect(dedicated.card?.title).toBe("Porto");
    expect(dedicated.durationMs).toBe(CHAPTER_SLIDE_MS);
    expect(dedicated.card?.revealAtMs).toBeUndefined();
    const pair = pictureSlideOf(composed[1]);
    expect(pair.image.src).toBe("pictures/p1.jpg");
    expect(pair.partner?.image.src).toBe("pictures/p2.jpg");
    expect(pair.card).toBeUndefined();
    expect(pair.durationMs).toBe(5000);
  });

  it("falls back to a dedicated slide of its own when the anchor is a video too short for the reveal", () => {
    const shortVideoSlides = [plainSlide("p1"), videoSlide("p2", 2000), plainSlide("p3")];

    const composed = composeChapters(
      [chapter],
      pictures,
      shortVideoSlides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(composed).toHaveLength(4);
    const dedicated = pictureSlideOf(composed[1]);
    expect(dedicated.video).toBeUndefined();
    expect(dedicated.durationMs).toBe(CHAPTER_SLIDE_MS);
    const clip = pictureSlideOf(composed[2]);
    expect(clip.video).toBeDefined();
    expect(clip.durationMs).toBe(2000);
    expect(clip.card).toBeUndefined();
  });

  it("merges onto a video long enough for the reveal, without lengthening its clip", () => {
    const longVideoSlides = [plainSlide("p1"), videoSlide("p2", 9000), plainSlide("p3")];

    const composed = composeChapters(
      [chapter],
      pictures,
      longVideoSlides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(composed).toHaveLength(3);
    const merged = pictureSlideOf(composed[1]);
    expect(merged.video).toBeDefined();
    expect(merged.durationMs).toBe(9000);
    expect(merged.card).toMatchObject({
      title: "Porto",
      revealAtMs: CHAPTER_SLIDE_MS - CARD_REVEAL_MS,
    });
  });

  it("produces no change when there are no chapters to insert", () => {
    expect(
      composeChapters([], pictures, slides, sources, NO_FOCUS, DEFAULT_SLIDESHOW_TRANSITION),
    ).toEqual(slides);
  });
});
