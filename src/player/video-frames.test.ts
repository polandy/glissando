import { describe, expect, it } from "vitest";
import type { VideoFrameSource } from "./ports";
import type { PictureSlide, Slide } from "./slideshow";
import { FakeVideoFrames, labelOf } from "./testing/fake-videos";
import { VideoFrames } from "./video-frames";

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

/** a: 0–10 s, 1 s transition; clip: 10–14 s (clip 5–9 s); c: 14–20 s. */
const SLIDES: Slide[] = [
  picture(10_000, 1000),
  { ...picture(4000), video: { src: "c.mp4", startMs: 5000, endMs: 9000, volume: 1 } },
  picture(6000),
];

function setUp() {
  const sources: FakeVideoFrames[] = [];
  const open = (src: string): VideoFrameSource => {
    const source = new FakeVideoFrames(src);
    sources.push(source);
    return source;
  };
  return { frames: new VideoFrames(SLIDES, open), sources };
}

describe("video frames for the export", () => {
  it("asks the clip's source for the frame at startMs plus the slide's time", async () => {
    const { frames, sources } = setUp();
    await frames.load(11_500);
    expect(sources.map((source) => source.requested)).toEqual([[6500]]);
    expect(labelOf(frames.frameAt(1))).toBe("c.mp4@6500");
  });

  it("asks for the frame of a clip in its lead-in too", async () => {
    const { frames, sources } = setUp();
    await frames.load(9500);
    expect(sources[0]?.requested).toEqual([4500]);
  });

  it("opens no source for a clip that is not on screen", async () => {
    const { frames, sources } = setUp();
    await frames.load(1000);
    expect(sources).toEqual([]);
    expect(frames.frameAt(1)).toBeUndefined();
  });

  it("opens a clip's source once and releases it when its slide is over", async () => {
    const { frames, sources } = setUp();
    await frames.load(11_000);
    await frames.load(12_000);
    await frames.load(15_000);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.requested).toEqual([6000, 7000]);
    expect(sources[0]?.disposed).toBe(true);
    expect(frames.frameAt(1)).toBeUndefined();
  });

  it("disposes every source", async () => {
    const { frames, sources } = setUp();
    await frames.load(11_000);
    frames.dispose();
    expect(sources[0]?.disposed).toBe(true);
  });
});
