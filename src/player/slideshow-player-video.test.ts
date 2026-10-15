import { describe, expect, it } from "vitest";
import { VideoPlaybackError } from "./ports";
import type { PictureSlide, Slide, Slideshow } from "./slideshow";
import { SlideshowPlayer } from "./slideshow-player";
import { FakeVideoFrames, FakeVideos, fakeLiveFrame, labelOf } from "./testing/fake-videos";
import {
  FakeClock,
  FakeFrameScheduler,
  FakeMusic,
  FakePictureLoader,
  FakeRenderer,
} from "./testing/fakes";
import { VIDEO_DUCK_RAMP_DOWN_MS, VIDEO_DUCK_VOLUME } from "./video-duck";

const STILL = {
  from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  easing: "linear",
} as const;

function picture(src: string, durationMs: number, transitionMs?: number): PictureSlide {
  return {
    image: { src, capturedAt: "2025-07-01T10:00:00Z" },
    durationMs,
    kenBurns: STILL,
    ...(transitionMs === undefined
      ? {}
      : { transitionToNext: { effect: "crossfade" as const, durationMs: transitionMs } }),
  };
}

/** a: 0–4 s, 1 s crossfade into the clip; clip: 4–8 s (clip 2–6 s); c: 8–10 s. */
const SLIDES: Slide[] = [
  picture("a.jpg", 4000, 1000),
  { ...picture("v.jpg", 4000), video: { src: "v.mp4", startMs: 2000, endMs: 6000, volume: 0.5 } },
  picture("c.jpg", 2000),
];

const SLIDESHOW: Slideshow = {
  formatVersion: 7,
  title: "Clips",
  music: [{ src: "m.mp3", atMs: 0, startMs: 0, endMs: 600_000, fadeInMs: 0, fadeOutMs: 0 }],
  slides: SLIDES,
};

function setUp(options: { readonly frames?: boolean } = {}) {
  const clock = new FakeClock();
  const scheduler = new FakeFrameScheduler();
  const pictures = new FakePictureLoader();
  const renderer = new FakeRenderer();
  const music = new FakeMusic();
  const videos = new FakeVideos();
  const frameSources: FakeVideoFrames[] = [];
  const player = new SlideshowPlayer(SLIDESHOW, {
    renderer,
    pictures,
    clock,
    frames: scheduler,
    openMusic: () => music,
    ...(options.frames === true
      ? {
          openVideoFrames: (src: string) => {
            const source = new FakeVideoFrames(src);
            frameSources.push(source);
            return source;
          },
        }
      : { openVideo: videos.open }),
  });
  const errors: Event[] = [];
  player.addEventListener("error", (event) => errors.push(event));
  return {
    player,
    clock,
    music,
    videos,
    pictures,
    renderer,
    frameSources,
    errors,
    advance(ms: number) {
      clock.advance(ms);
      scheduler.runFrame();
    },
    /** Loads the pictures of the slides on screen at the show time the player is at. */
    async showing(...sources: string[]) {
      const loaded = new Promise((resolve) =>
        player.addEventListener("canplay", resolve, { once: true }),
      );
      sources.forEach((source) => pictures.complete(source));
      await loaded;
    },
  };
}

function liveOf(frame: FakeRenderer["lastFrame"]) {
  if (frame?.kind !== "slide" || frame.slide.kind !== "picture") {
    throw new Error("expected a picture slide frame");
  }
  return frame.slide.live;
}

describe("a player with video slides", () => {
  it("draws the poster until the clip delivers a frame, then the frame, also while paused", async () => {
    const run = setUp();
    run.player.currentTime = 5;
    await run.showing("v.jpg");
    const video = run.videos.only();
    expect(liveOf(run.renderer.lastFrame)).toBeUndefined();
    expect(video.calls).toEqual(["seek@3000"]);
    video.deliverFrame(fakeLiveFrame("seeked"));
    expect(labelOf(liveOf(run.renderer.lastFrame))).toBe("seeked");
  });

  it("plays the clip from the transition into it and keeps it at the slide's time", async () => {
    const run = setUp();
    run.player.currentTime = 3;
    await run.showing("a.jpg", "v.jpg");
    run.player.play();
    run.advance(500);
    run.advance(1500);
    expect(run.videos.only().calls).toEqual([
      "seek@1000",
      "play@1000",
      "follow@1500",
      "follow@3000",
    ]);
  });

  it("starts the clock only once a clip that was put in place is ready to play", async () => {
    const run = setUp();
    run.player.currentTime = 5;
    await run.showing("v.jpg");
    const video = run.videos.only();
    video.ready = false;

    run.player.play();
    run.advance(1000);
    expect(run.player.currentTime).toBe(5);

    const playing = new Promise((resolve) =>
      run.player.addEventListener("playing", resolve, { once: true }),
    );
    video.becomeReady();
    await playing;
    run.advance(1000);
    expect(run.player.currentTime).toBe(6);
  });

  it("pauses the clip when the show pauses", async () => {
    const run = setUp();
    run.player.currentTime = 5;
    await run.showing("v.jpg");
    run.player.play();
    run.player.pause();
    expect(run.videos.only().calls.slice(-1)).toEqual(["pause"]);
  });

  it("fails with a VideoPlaybackError when the browser refuses the clip", async () => {
    const run = setUp();
    run.player.currentTime = 5;
    await run.showing("v.jpg");
    run.videos.only().refuseNextPlay(new Error("NotAllowedError"));
    run.player.play();
    await Promise.resolve();
    await Promise.resolve();
    expect(run.errors).toHaveLength(1);
    expect(run.player.error).toBeInstanceOf(VideoPlaybackError);
    expect(run.player.paused).toBe(true);
  });

  it("puts the clip back by a hard seek when the show is seeked while playing", async () => {
    const run = setUp();
    run.player.currentTime = 5;
    await run.showing("v.jpg");
    run.player.play();
    run.player.currentTime = 6.5;
    expect(run.videos.only().calls).toEqual([
      "seek@3000",
      "play@3000",
      "pause",
      "seek@4500",
      "play@4500",
    ]);
  });

  it("disposes the clips with the player", async () => {
    const run = setUp();
    run.player.currentTime = 5;
    await run.showing("v.jpg");
    run.player.destroy();
    expect(run.videos.only().disposed).toBe(true);
  });

  it("multiplies the music's volume by the duck factor while the clip's sound plays", async () => {
    const run = setUp();
    run.player.currentTime = (4000 - VIDEO_DUCK_RAMP_DOWN_MS / 2) / 1000;
    await run.showing("a.jpg", "v.jpg");
    run.player.play();
    expect(run.music.volume).toBeCloseTo((1 + VIDEO_DUCK_VOLUME) / 2, 5);
    run.advance(VIDEO_DUCK_RAMP_DOWN_MS);
    expect(run.music.volume).toBe(VIDEO_DUCK_VOLUME);
  });

  it("leaves the music at its own volume far from every clip", async () => {
    const run = setUp();
    await run.showing("a.jpg", "v.jpg");
    run.player.play();
    expect(run.music.volume).toBe(1);
  });
});

describe("renderAt with a video frame source", () => {
  it("draws the clip's frame at startMs plus the slide's time", async () => {
    const run = setUp({ frames: true });
    const drawn = run.player.renderAt(5);
    await Promise.resolve();
    run.pictures.complete("v.jpg");
    await drawn;
    expect(run.frameSources[0]?.requested).toEqual([3000]);
    expect(labelOf(liveOf(run.renderer.lastFrame))).toBe("v.mp4@3000");
  });
});
