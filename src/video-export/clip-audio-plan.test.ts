import { describe, expect, it } from "vitest";
import type { Slide } from "../player";
import { clipAudioSlides, clipSecondsFor, placeClipBuffer } from "./clip-audio-plan";

function picture(durationMs: number): Slide {
  return { image: { src: "p" }, durationMs } as Slide;
}
function clip(durationMs: number, volume: number, startMs = 2000): Slide {
  return {
    image: { src: "p" },
    durationMs,
    video: { src: "videos/1", startMs, endMs: startMs + durationMs, volume },
  } as Slide;
}

describe("clipAudioSlides", () => {
  it("lists the clips with sound where their slides start, skipping silent ones", () => {
    const slides = [picture(3000), clip(4000, 0.5), clip(1000, 0), picture(500), clip(2000, 1, 0)];

    expect(clipAudioSlides(slides)).toEqual([
      { src: "videos/1", atMs: 3000, startMs: 2000, endMs: 6000, volume: 0.5 },
      { src: "videos/1", atMs: 8500, startMs: 0, endMs: 2000, volume: 1 },
    ]);
  });
});

const CLIP = { src: "v", atMs: 10_000, startMs: 2000, endMs: 6000, volume: 1 };

describe("clipSecondsFor", () => {
  it("maps a show-time window to the clip seconds inside the excerpt", () => {
    expect(clipSecondsFor(CLIP, 9000, 12_000)).toEqual({ fromSeconds: 2, toSeconds: 4 });
  });

  it("is null for a window outside the slide", () => {
    expect(clipSecondsFor(CLIP, 0, 10_000)).toBeNull();
    expect(clipSecondsFor(CLIP, 14_000, 20_000)).toBeNull();
  });
});

describe("placeClipBuffer", () => {
  it("places a buffer by its clip time, relative to the window", () => {
    expect(placeClipBuffer(CLIP, { startSeconds: 3, durationSeconds: 0.5 }, 9000)).toEqual({
      whenSeconds: 2,
      offsetSeconds: 0,
      durationSeconds: 0.5,
    });
  });

  it("cuts a buffer that begins before the excerpt", () => {
    expect(placeClipBuffer(CLIP, { startSeconds: 1.5, durationSeconds: 1 }, 9000)).toEqual({
      whenSeconds: 1,
      offsetSeconds: 0.5,
      durationSeconds: 0.5,
    });
  });

  it("cuts a buffer that runs past the excerpt's end", () => {
    expect(placeClipBuffer(CLIP, { startSeconds: 5.75, durationSeconds: 1 }, 10_000)).toEqual({
      whenSeconds: 3.75,
      offsetSeconds: 0,
      durationSeconds: 0.25,
    });
  });

  it("starts a buffer begun before the window at the window's start", () => {
    expect(placeClipBuffer(CLIP, { startSeconds: 3, durationSeconds: 1 }, 11_500)).toEqual({
      whenSeconds: 0,
      offsetSeconds: 0.5,
      durationSeconds: 0.5,
    });
  });

  it("is null for a buffer wholly outside", () => {
    expect(placeClipBuffer(CLIP, { startSeconds: 7, durationSeconds: 1 }, 9000)).toBeNull();
  });
});
