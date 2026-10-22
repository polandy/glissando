import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import { DEFAULT_SLIDESHOW_TRANSITION } from "../library/own-timing";
import type { StoredPicture } from "../library/stored-slideshow";
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
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  easing: "linear",
};

function plainSlide(pictureId: string, durationMs = 5000): PictureSlide {
  return {
    image: { src: `pictures/${pictureId}.jpg`, capturedAt: "2025-07-01T10:00:00Z" },
    durationMs,
    kenBurns: KEN_BURNS,
  };
}

const sources: PictureSource = { picture: (id) => `pictures/${id}.jpg` };
const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

function pictureSlide(slide: Slide | undefined): PictureSlide {
  if (slide === undefined || isGroundSlide(slide)) {
    throw new Error("expected a picture slide");
  }
  return slide;
}

describe("composeChapters", () => {
  const pictures = [picture("p1"), picture("p2"), picture("p3")];
  const slides = [plainSlide("p1"), plainSlide("p2"), plainSlide("p3")];
  const chapter: ComposedChapter = { anchorPictureId: "p2", title: "Porto", subtitle: "Day 2" };

  it("inserts a new slide right before the slide showing the anchor picture", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      slides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(composed).toHaveLength(4);
    expect(pictureSlide(composed[1]).image.src).toBe("pictures/p2.jpg");
    expect(pictureSlide(composed[2]).image.src).toBe("pictures/p2.jpg");
  });

  it("gives the inserted slide the chapter's title and subtitle, over the anchor picture", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      slides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(pictureSlide(composed[1]).card).toMatchObject({ title: "Porto", subtitle: "Day 2" });
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

    expect(pictureSlide(composed[1]).card).toMatchObject({
      style: "quiet",
      position: "bottom-left",
      entrance: "slow-fade",
      ink: "light",
      veil: { amount: 0.6, tint: "#404040" },
    });
  });

  it("gives the inserted slide the fixed chapter duration, not the anchor slide's own", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      [plainSlide("p1"), plainSlide("p2", 9000), plainSlide("p3")],
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(pictureSlide(composed[1]).durationMs).toBe(CHAPTER_SLIDE_MS);
    expect(CHAPTER_SLIDE_MS).toBe(3000);
  });

  it("leaves the existing slides and their own durations untouched", () => {
    const composed = composeChapters(
      [chapter],
      pictures,
      slides,
      sources,
      NO_FOCUS,
      DEFAULT_SLIDESHOW_TRANSITION,
    );

    expect(pictureSlide(composed[0]).durationMs).toBe(5000);
    expect(pictureSlide(composed[2]).durationMs).toBe(5000);
  });

  it("inserts several chapters, each before its own anchor", () => {
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

    expect(composed).toHaveLength(5);
    const titles = composed.map((slide) => (isGroundSlide(slide) ? undefined : slide.card?.title));
    expect(titles).toEqual([undefined, "Porto", undefined, "Sintra", undefined]);
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

    expect(composed).toHaveLength(5);
    expect(pictureSlide(composed[2]).card?.title).toBe("Porto");
    expect(pictureSlide(composed[3]).image.src).toBe("pictures/p2.jpg");
  });

  it("produces no slide when there are no chapters to insert", () => {
    expect(
      composeChapters([], pictures, slides, sources, NO_FOCUS, DEFAULT_SLIDESHOW_TRANSITION),
    ).toEqual(slides);
  });
});
