import { describe, expect, it } from "vitest";
import { VideoPlaybackError } from "./ports";
import type { PictureSlide, Slide } from "./slideshow";
import { FakeVideos, fakeLiveFrame, labelOf } from "./testing/fake-videos";
import { VideoClips } from "./video-clips";

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

function clip(src: string, startMs: number, endMs: number, volume = 0.8): PictureSlide {
  return { ...picture(endMs - startMs), video: { src, startMs, endMs, volume } };
}

/** a: 0–10 s, 1 s transition; clip: 10–14 s (clip 5–9 s); c: 14–20 s. */
const SLIDES: Slide[] = [picture(10_000, 1000), clip("c.mp4", 5000, 9000), picture(6000)];

function setUp(slides: readonly Slide[] = SLIDES) {
  const videos = new FakeVideos();
  const errors: Error[] = [];
  let frameReady = 0;
  const clips = new VideoClips(slides, videos.open, {
    onError: (error) => errors.push(error),
    onFrameReady: () => (frameReady += 1),
  });
  return { clips, videos, errors, frameReadyCount: () => frameReady };
}

describe("video clips", () => {
  it("reports a clip that cannot load before it ever plays, once", () => {
    const { clips, videos, errors } = setUp();
    clips.place(8000);
    const failure = new VideoPlaybackError(new Error("missing"));
    videos.only().fail(failure);
    videos.only().fail(failure);
    expect(errors).toEqual([failure]);
  });

  it("opens no playback before a clip is near", () => {
    const { clips, videos } = setUp();
    clips.place(1000);
    expect(videos.opened).toEqual([]);
  });

  it("opens a near clip once, with its own volume, and holds it at its lead-in position", () => {
    const { clips, videos } = setUp();
    clips.place(8000);
    clips.place(8100);
    const video = videos.only();
    expect(video.src).toBe("c.mp4");
    expect(video.openedWithVolume).toBe(0.8);
    expect(video.calls).toEqual(["seek@4000"]);
  });

  it("plays a clip from the transition's start and follows the clock afterwards", () => {
    const { clips, videos } = setUp();
    clips.play(8000);
    clips.place(8100);
    clips.place(9000);
    clips.place(9500);
    expect(videos.only().calls).toEqual(["seek@4000", "play@4000", "follow@4500"]);
  });

  it("is silent in the lead-in and audible, at the clip's volume, for the slide's own time", () => {
    const { clips, videos } = setUp();
    clips.play(9000);
    expect(videos.only().volume).toBe(0);
    clips.place(10_500);
    expect(videos.only().volume).toBe(0.8);
  });

  it("seeks a paused clip only when the show moved it", () => {
    const { clips, videos } = setUp();
    clips.place(11_000);
    clips.place(11_000);
    clips.place(12_000);
    expect(videos.only().calls).toEqual(["seek@6000", "seek@7000"]);
  });

  it("pauses its clips and plays them again from the show's time", () => {
    const { clips, videos } = setUp();
    clips.play(11_000);
    clips.pause();
    clips.play(11_000);
    expect(videos.only().calls).toEqual(["play@6000", "pause", "play@6000"]);
  });

  it("puts a clip back by a hard seek after the show was seeked while playing", () => {
    const { clips, videos } = setUp();
    clips.play(11_000);
    clips.restart();
    clips.place(12_500);
    expect(videos.only().calls).toEqual(["play@6000", "play@7500"]);
  });

  it("releases a clip once its slide is over", () => {
    const { clips, videos } = setUp();
    clips.place(11_000);
    clips.place(14_500);
    expect(videos.only().disposed).toBe(true);
  });

  it("hands out the clip's frame once it is ready, and tells when one became ready", () => {
    const { clips, videos, frameReadyCount } = setUp();
    clips.place(11_000);
    expect(clips.frameAt(1)).toBeUndefined();
    videos.only().deliverFrame(fakeLiveFrame("first"));
    expect(labelOf(clips.frameAt(1))).toBe("first");
    expect(frameReadyCount()).toBe(1);
  });

  it("reports a refused play as a VideoPlaybackError", async () => {
    const { clips, videos, errors } = setUp();
    clips.place(11_000);
    const cause = new Error("NotAllowedError");
    videos.only().refuseNextPlay(cause);
    clips.play(11_000);
    await Promise.resolve();
    await Promise.resolve();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(VideoPlaybackError);
    expect(errors[0]?.cause).toBe(cause);
  });

  it("disposes every playback", () => {
    const { clips, videos } = setUp();
    clips.place(11_000);
    clips.dispose();
    expect(videos.only().disposed).toBe(true);
  });
  it("resolves whenReady only once a clip on screen can play on", async () => {
    const { clips, videos } = setUp();
    videos.readyOnOpen = false;
    let resolved = false;
    const pending = clips.whenReady(10_000).then(() => (resolved = true));
    await Promise.resolve();
    expect(resolved).toBe(false);

    videos.only().becomeReady();
    await pending;
    expect(resolved).toBe(true);
  });

  describe("a clip with less footage before its excerpt than the lead-in", () => {
    /** The transition into the clip starts at 9000; its footage reaches the clock at 9800. */
    const SHORT_LEAD: Slide[] = [picture(10_000, 1000), clip("c.mp4", 200, 4200)];

    it("holds its first frame while its slide fades in, then plays to its end with the slide", () => {
      const { clips, videos } = setUp(SHORT_LEAD);
      clips.play(9000);
      clips.place(9500);
      clips.place(9800);
      clips.place(13_900);
      expect(videos.only().calls).toEqual(["seek@0", "play@0", "follow@4100"]);
    });

    it("waits in whenReady for the held clip, which is already on screen", async () => {
      const { clips, videos } = setUp(SHORT_LEAD);
      videos.readyOnOpen = false;
      let resolved = false;
      const pending = clips.whenReady(9500).then(() => (resolved = true));
      await Promise.resolve();
      expect(resolved).toBe(false);

      videos.only().becomeReady();
      await pending;
      expect(resolved).toBe(true);
    });
  });

  it("resolves whenReady at once when no clip is on screen", async () => {
    const { clips } = setUp();
    await expect(clips.whenReady(1000)).resolves.toBeUndefined();
  });
});
