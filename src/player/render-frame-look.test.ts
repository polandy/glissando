import { describe, expect, it } from "vitest";
import { renderFrame, type RenderFrameContext } from "./render-frame";
import type { PictureSlide, Slideshow } from "./slideshow";
import type { TimelineFrame } from "./timeline";

function pictureSlide(overrides: Partial<PictureSlide> = {}): PictureSlide {
  return {
    image: { src: "a.jpg", capturedAt: "2025-07-01T10:00:00Z" },
    durationMs: 4000,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1.2, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
    ...overrides,
  };
}

const NO_FADE: RenderFrameContext = { showDurationMs: 4000, reducedMotion: false };

function slideFrame(index: number, slideTimeMs: number, showTimeMs = slideTimeMs): TimelineFrame {
  return { kind: "slide", slide: { index, kenBurnsProgress: 0, slideTimeMs }, showTimeMs };
}

describe("renderFrame: look (ADR-0044)", () => {
  const picture = { src: "a.jpg", width: 1600, height: 900 };

  it("is none when the show has no look", () => {
    const slideshow: Slideshow = { formatVersion: 9, title: "Lake", slides: [pictureSlide()] };

    const drawn = renderFrame(slideFrame(0, 0), slideshow, NO_FADE, () => [picture]);

    expect(drawn.look).toBe("none");
  });

  it("carries the show's look", () => {
    const slideshow: Slideshow = {
      formatVersion: 9,
      title: "Lake",
      look: "warm",
      slides: [pictureSlide()],
    };

    const drawn = renderFrame(slideFrame(0, 0), slideshow, NO_FADE, () => [picture]);

    expect(drawn.look).toBe("warm");
  });

  it("carries the show's look through a transition frame too", () => {
    const slideshow: Slideshow = {
      formatVersion: 9,
      title: "Lake",
      look: "cool",
      slides: [
        pictureSlide({ transitionToNext: { effect: "crossfade", durationMs: 1000 } }),
        pictureSlide(),
      ],
    };
    const transitionFrame: TimelineFrame = {
      kind: "transition",
      effect: "crossfade",
      progress: 0.5,
      from: { index: 0, kenBurnsProgress: 1, slideTimeMs: 3500 },
      to: { index: 1, kenBurnsProgress: 0, slideTimeMs: 0 },
      showTimeMs: 3500,
    };

    const drawn = renderFrame(transitionFrame, slideshow, NO_FADE, () => [picture]);

    expect(drawn.look).toBe("cool");
  });
});
