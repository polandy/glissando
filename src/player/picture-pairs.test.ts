import { describe, expect, it } from "vitest";
import { FramePictures } from "./frame-pictures";
import { PictureBuffer, SlideshowLoadError } from "./picture-buffer";
import { renderFrame } from "./render-frame";
import { slide } from "./slideshow-player-fixtures";
import type { Slide, Slideshow } from "./slideshow";
import { FakePictureLoader, FakeRenderer, type FakePicture } from "./testing/fakes";
import type { TimelineFrame } from "./timeline";

const PARTNER_KEN_BURNS = {
  from: { zoom: 1.2, centerX: 0.4, centerY: 0.5 },
  to: { zoom: 1.2, centerX: 0.6, centerY: 0.5 },
  easing: "linear",
} as const;

function paired(src: string, partnerSrc: string): Slide {
  return {
    ...slide(src, 4000),
    partner: {
      image: { src: partnerSrc, capturedAt: "2025-07-01T10:00:00Z" },
      kenBurns: PARTNER_KEN_BURNS,
    },
  };
}

/** a+b paired, then c alone. */
const SOURCES = [["a.jpg", "b.jpg"], ["c.jpg"]] as const;

function setUpBuffer() {
  const loader = new FakePictureLoader();
  const renderer = new FakeRenderer();
  const buffer = new PictureBuffer<FakePicture>(SOURCES, loader, renderer, 0);
  return { loader, renderer, buffer };
}

describe("PictureBuffer, a paired slide (ADR-0028)", () => {
  it("loads both pictures of a paired slide and holds them, its own first", async () => {
    const { loader, buffer } = setUpBuffer();

    const kept = buffer.keep([0]);
    loader.complete("a.jpg");
    loader.complete("b.jpg");
    await kept;

    expect(loader.requested).toEqual(["a.jpg", "b.jpg"]);
    expect(buffer.get(0)?.map((picture) => picture.src)).toEqual(["a.jpg", "b.jpg"]);
  });

  it("forgets and releases both pictures once the paired slide is left behind", async () => {
    const { loader, renderer, buffer } = setUpBuffer();
    const kept = buffer.keep([0]);
    loader.complete("a.jpg");
    loader.complete("b.jpg");
    await kept;

    const next = buffer.keep([1]);
    loader.complete("c.jpg");
    await next;

    expect(buffer.get(1)?.map((picture) => picture.src)).toEqual(["c.jpg"]);
    expect(renderer.forgotten).toEqual(["a.jpg", "b.jpg"]);
    expect(loader.released).toEqual(["a.jpg", "b.jpg"]);
  });

  it("releases the loaded picture of a pair whose partner fails, and reports the failure", async () => {
    const { loader, buffer } = setUpBuffer();
    const kept = buffer.keep([0]);
    loader.complete("a.jpg");
    loader.fail("b.jpg", new Error("404"));

    await expect(kept).rejects.toBeInstanceOf(SlideshowLoadError);
    expect(buffer.get(0)).toBeUndefined();
    expect(loader.released).toEqual(["a.jpg"]);
  });
});

describe("renderFrame, a paired slide (ADR-0028)", () => {
  it("draws the partner picture with the partner's own Ken Burns motion", () => {
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Pairs",
      slides: [paired("a.jpg", "b.jpg")],
    };
    const own = { src: "a.jpg", width: 900, height: 1600 };
    const partner = { src: "b.jpg", width: 900, height: 1600 };
    const frame: TimelineFrame = {
      kind: "slide",
      slide: { index: 0, kenBurnsProgress: 0.25, slideTimeMs: 1000 },
      showTimeMs: 1000,
    };
    const context = { showDurationMs: 4000, reducedMotion: false };

    const drawn = renderFrame(frame, slideshow, context, () => [own, partner]);

    expect(drawn.kind === "slide" && drawn.slide.kind === "picture" && drawn.slide.picture).toBe(
      own,
    );
    expect(drawn.kind === "slide" && drawn.slide.kind === "picture" && drawn.slide.partner).toEqual(
      {
        picture: partner,
        motion: { kenBurns: PARTNER_KEN_BURNS, progress: 0.25 },
      },
    );
  });
});

describe("FramePictures, a paired slide (ADR-0028)", () => {
  it("prepares both pictures of an upcoming paired slide", async () => {
    const slideshow: Slideshow = {
      formatVersion: 5,
      title: "Pairs",
      slides: [slide("c.jpg", 4000), paired("a.jpg", "b.jpg")],
    };
    const loader = new FakePictureLoader();
    const renderer = new FakeRenderer();
    let frame: TimelineFrame = {
      kind: "slide",
      slide: { index: 1, kenBurnsProgress: 0, slideTimeMs: 0 },
      showTimeMs: 4000,
    };
    const context = () => ({ showDurationMs: 8000, reducedMotion: false });
    const pictures = new FramePictures(slideshow, () => frame, context, loader, renderer, 1);
    const pairLoaded = pictures.loadAroundScreen();
    loader.complete("a.jpg");
    loader.complete("b.jpg");
    await pairLoaded;
    frame = {
      kind: "slide",
      slide: { index: 0, kenBurnsProgress: 0, slideTimeMs: 0 },
      showTimeMs: 0,
    };
    const firstLoaded = pictures.loadAroundScreen();
    loader.complete("c.jpg");
    await firstLoaded;

    pictures.prepareUpcoming();

    expect(
      renderer.prepared.map((prepared) =>
        "picture" in prepared ? prepared.picture.src : undefined,
      ),
    ).toEqual(["a.jpg", "b.jpg"]);
  });
});
