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

/**
 * clip's video.startMs (1000) is inside the lead-in (3000): the file has 1000 ms of footage
 * before the excerpt, 2000 ms too little to fill the transition into the clip's slide, which
 * starts at 7000; the slide itself runs 10_000–14_000.
 */
describe("a clip whose file's start falls inside the lead-in", () => {
  const slides = [picture(10_000, 3000), clip(1000, 5000)];
  const plan = createClipPlan(slides);

  it("holds its first frame while the transition starts, until its footage reaches the clock", () => {
    expect(plan(7000)).toMatchObject([{ phase: "holding", clipMs: 0, soundOn: false }]);
    expect(plan(8999)).toMatchObject([{ phase: "holding", clipMs: 0 }]);
    expect(plan(9000)).toMatchObject([{ phase: "playing", clipMs: 0 }]);
  });

  it("holds the waiting position at the clip time it starts playing from, so play needs no seek", () => {
    const waitingClipMs = plan(7000 - VIDEO_PRELOAD_MS)[0]?.clipMs;

    expect(waitingClipMs).toBe(0);
    expect(plan(9000)[0]?.clipMs).toBe(waitingClipMs);
  });

  it("starts the clip's sound with its slide", () => {
    expect(plan(9999)[0]).toMatchObject({ soundOn: false });
    expect(plan(10_000)[0]).toMatchObject({ soundOn: true, clipMs: 1000 });
  });

  it("keeps the picture moving until its slide ends, reaching the file's end only then", () => {
    expect(plan(12_000)[0]).toMatchObject({ phase: "playing", clipMs: 3000 });
    expect(plan(13_999)[0]).toMatchObject({ phase: "playing", clipMs: 4999 });
  });
});
