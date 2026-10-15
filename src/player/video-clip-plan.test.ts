import { describe, expect, it } from "vitest";
import type { PictureSlide, Slide, SlideVideo } from "./slideshow";
import { createClipPlan, VIDEO_PRELOAD_MS } from "./video-clip-plan";

const STILL = {
  from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  easing: "linear",
} as const;

function picture(durationMs: number, transitionMs?: number): PictureSlide {
  return {
    image: { src: "p.jpg", capturedAt: "2025-07-01T10:00:00Z" },
    durationMs,
    kenBurns: STILL,
    ...(transitionMs === undefined
      ? {}
      : { transitionToNext: { effect: "crossfade" as const, durationMs: transitionMs } }),
  };
}

function clip(startMs: number, endMs: number, transitionMs?: number): PictureSlide {
  const video: SlideVideo = { src: "c.mp4", startMs, endMs, volume: 0.8 };
  return { ...picture(endMs - startMs, transitionMs), video };
}

/** a: 0–10 s, 1 s transition; clip: 10–14 s (clip 5–9 s), 1 s transition; c: 14–20 s. */
const SLIDES: Slide[] = [picture(10_000, 1000), clip(5000, 9000, 1000), picture(6000)];

describe("the clip plan", () => {
  const plan = createClipPlan(SLIDES);

  it("plans nothing for a show without video slides", () => {
    expect(createClipPlan([picture(1000)])(0)).toEqual([]);
  });

  it("puts a clip at startMs plus the slide's time while the slide plays", () => {
    const [target] = plan(11_500);
    expect(target).toMatchObject({
      index: 1,
      phase: "playing",
      clipMs: 6500,
      soundOn: true,
    });
  });

  it("starts the clip with the transition into it, its slide time negative", () => {
    const [target] = plan(9000);
    expect(target).toMatchObject({ phase: "playing", clipMs: 4000, soundOn: false });
  });

  it("holds a clip at the start of its file while the lead-in reaches back before it", () => {
    const slides = [picture(10_000, 3000), clip(1000, 5000)];

    expect(createClipPlan(slides)(7000)).toMatchObject([{ phase: "waiting", clipMs: 0 }]);
    expect(createClipPlan(slides)(9000)).toMatchObject([{ phase: "playing", clipMs: 0 }]);
    expect(createClipPlan(slides)(9500)).toMatchObject([{ phase: "playing", clipMs: 500 }]);
  });

  it("keeps the clip playing, with its sound, through the transition out of its slide", () => {
    const [target] = plan(13_500);
    expect(target).toMatchObject({ phase: "playing", clipMs: 8500, soundOn: true });
  });

  it("opens the clip waiting, at its lead-in position, shortly before its transition starts", () => {
    const [target] = plan(9000 - VIDEO_PRELOAD_MS);
    expect(target).toMatchObject({ index: 1, phase: "waiting", clipMs: 4000, soundOn: false });
  });

  it("plans nothing before the preload span or after the slide", () => {
    expect(plan(9000 - VIDEO_PRELOAD_MS - 1)).toEqual([]);
    expect(plan(14_000)).toEqual([]);
  });

  it("keeps the last slide's clip planned at the very end of the show", () => {
    const last = createClipPlan([clip(0, 4000)]);
    expect(last(4000)[0]).toMatchObject({ phase: "playing", clipMs: 4000 });
  });
});
