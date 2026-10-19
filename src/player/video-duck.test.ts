import { describe, expect, it } from "vitest";
import type { PictureSlide, Slide } from "./slideshow";
import {
  duckFactorAt,
  VIDEO_DUCK_RAMP_DOWN_MS,
  VIDEO_DUCK_RAMP_UP_MS,
  VIDEO_DUCK_VOLUME,
  videoSoundSpans,
} from "./video-duck";

const SPAN = { startMs: 10_000, endMs: 20_000 };

describe("duckFactorAt", () => {
  it.each([
    ["far before the span", 0, 1],
    ["where the ramp down starts", SPAN.startMs - VIDEO_DUCK_RAMP_DOWN_MS, 1],
    [
      "halfway down the ramp",
      SPAN.startMs - VIDEO_DUCK_RAMP_DOWN_MS / 2,
      (1 + VIDEO_DUCK_VOLUME) / 2,
    ],
    ["where the slide starts", SPAN.startMs, VIDEO_DUCK_VOLUME],
    ["inside the span", 15_000, VIDEO_DUCK_VOLUME],
    ["where the slide ends", SPAN.endMs, VIDEO_DUCK_VOLUME],
    ["halfway up the ramp", SPAN.endMs + VIDEO_DUCK_RAMP_UP_MS / 2, (1 + VIDEO_DUCK_VOLUME) / 2],
    ["where the ramp up ends", SPAN.endMs + VIDEO_DUCK_RAMP_UP_MS, 1],
    ["far after the span", 60_000, 1],
  ])("is right %s", (_name, timeMs, expected) => {
    expect(duckFactorAt(timeMs, [SPAN])).toBeCloseTo(expected, 10);
  });

  it("ducks the music to 25 % under a clip's sound, staying audible", () => {
    expect(duckFactorAt(15_000, [SPAN])).toBe(0.25);
  });

  it("is 1 without spans", () => {
    expect(duckFactorAt(5000, [])).toBe(1);
  });

  it("swells back more slowly than it ducks", () => {
    expect(VIDEO_DUCK_RAMP_UP_MS).toBeGreaterThan(VIDEO_DUCK_RAMP_DOWN_MS);
  });

  it("stays ducked between spans closer than a ramp up and a ramp down", () => {
    const gapMs = VIDEO_DUCK_RAMP_UP_MS + VIDEO_DUCK_RAMP_DOWN_MS - 1;
    const spans = [SPAN, { startMs: SPAN.endMs + gapMs, endMs: 40_000 }];

    expect(duckFactorAt(SPAN.endMs + gapMs / 2, spans)).toBe(VIDEO_DUCK_VOLUME);
  });

  it("rises between spans just over a ramp up plus a ramp down apart", () => {
    const gapMs = VIDEO_DUCK_RAMP_UP_MS + VIDEO_DUCK_RAMP_DOWN_MS + 1;
    const spans = [SPAN, { startMs: SPAN.endMs + gapMs, endMs: 40_000 }];

    expect(duckFactorAt(SPAN.endMs + VIDEO_DUCK_RAMP_UP_MS, spans)).toBe(1);
  });

  it("rises between spans further apart than two ramps", () => {
    const spans = [SPAN, { startMs: SPAN.endMs + 5000, endMs: 40_000 }];

    expect(duckFactorAt(SPAN.endMs + 2500, spans)).toBe(1);
  });
});

function picture(overrides: Partial<PictureSlide> = {}): Slide {
  return {
    image: { src: "p.jpg", capturedAt: "2025-07-01" },
    durationMs: 3000,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
    ...overrides,
  };
}

function clip(durationMs: number, video: { volume: number; duckMusic?: boolean }): Slide {
  return picture({
    durationMs,
    video: { src: "videos/1.mp4", startMs: 0, endMs: durationMs, ...video },
  });
}

describe("videoSoundSpans", () => {
  it("lists the clips with sound in show time", () => {
    const slides = [picture(), clip(4000, { volume: 1 }), clip(2000, { volume: 0.5 })];

    expect(videoSoundSpans(slides)).toEqual([
      { startMs: 3000, endMs: 7000 },
      { startMs: 7000, endMs: 9000 },
    ]);
  });

  it("skips a muted clip and one that lets the music keep its volume", () => {
    const slides = [
      clip(4000, { volume: 0 }),
      clip(4000, { volume: 1, duckMusic: false }),
      clip(1000, { volume: 1, duckMusic: true }),
    ];

    expect(videoSoundSpans(slides)).toEqual([{ startMs: 8000, endMs: 9000 }]);
  });

  it("starts a shifted clip's duck span where its sound starts, inside the transition", () => {
    // video.startMs (1000) is inside the 3000 ms lead-in: shiftMs = 3000 - 1000 = 2000.
    const slides = [
      picture({ transitionToNext: { effect: "crossfade", durationMs: 3000 } }),
      picture({
        durationMs: 4000,
        video: { src: "videos/1.mp4", startMs: 1000, endMs: 5000, volume: 1 },
      }),
    ];

    expect(videoSoundSpans(slides)).toEqual([{ startMs: 1000, endMs: 7000 }]);
  });
});
