import { describe, expect, it } from "vitest";
import type { MusicTrack, Slide, Slideshow } from "./slideshow";
import { SlideshowPlayer } from "./slideshow-player";
import {
  FakeClock,
  FakeFrameScheduler,
  FakeMusicTracks,
  FakePictureLoader,
  FakeRenderer,
} from "./testing/fakes";

function slide(src: string, durationMs: number): Slide {
  return {
    image: { src, capturedAt: "2025-07-01T10:00:00Z" },
    durationMs,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
  };
}

/** Heard from 0 to 6 s of the slideshow, fading out over its last 2 s. */
const SUMMER: MusicTrack = {
  src: "summer.mp3",
  atMs: 0,
  startMs: 10_000,
  endMs: 16_000,
  fadeInMs: 0,
  fadeOutMs: 2000,
};

/** Heard from 4 s to 12 s of the slideshow, fading in over the crossfade with `SUMMER`. */
const AUTUMN: MusicTrack = {
  src: "autumn.mp3",
  atMs: 4000,
  startMs: 0,
  endMs: 8000,
  fadeInMs: 2000,
  fadeOutMs: 0,
};

function setUp() {
  const slideshow: Slideshow = {
    formatVersion: 7,
    title: "July 2025",
    music: [SUMMER, AUTUMN],
    slides: [slide("a.jpg", 4000), slide("b.jpg", 4000), slide("c.jpg", 4000)],
  };
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const pictures = new FakePictureLoader();
  const tracks = new FakeMusicTracks();
  const player = new SlideshowPlayer(slideshow, {
    renderer: new FakeRenderer(),
    pictures,
    clock,
    frames,
    openMusic: tracks.open,
  });
  return {
    player,
    summer: tracks.of(SUMMER.src),
    autumn: tracks.of(AUTUMN.src),
    async ready() {
      const shown = new Promise((resolve) =>
        player.addEventListener("canplay", resolve, { once: true }),
      );
      pictures.complete("a.jpg");
      pictures.complete("b.jpg");
      await shown;
    },
    advance(ms: number) {
      clock.advance(ms);
      frames.runFrame();
    },
  };
}

describe("SlideshowPlayer with a playlist of placed tracks", () => {
  it("starts the tracks heard at play time and primes the next one silently at its start in the play gesture", async () => {
    const { player, summer, autumn, ready } = setUp();
    await ready();

    player.play();

    expect(summer.calls).toEqual(["play@10"]);
    expect(autumn.calls).toEqual(["play@0", "pause"]);
    expect(autumn.volumesAtPlay).toEqual([0]);
  });

  it("starts the next track at its start once play time reaches its place", async () => {
    const { player, autumn, ready, advance } = setUp();
    await ready();
    player.play();

    advance(4000);

    expect(autumn.calls).toEqual(["play@0", "pause", "play@0"]);
    expect(autumn.volume).toBe(0);
  });

  it("sounds both tracks in the crossfade, each on its own envelope", async () => {
    const { player, summer, autumn, ready, advance } = setUp();
    await ready();
    player.play();
    advance(4000);

    advance(1000);

    expect(summer.volume).toBeCloseTo(0.5);
    expect(autumn.volume).toBeCloseTo(0.5);
  });

  it("pauses the first track at its end while the next one plays on", async () => {
    const { player, summer, autumn, ready, advance } = setUp();
    await ready();
    player.play();
    advance(4000);

    advance(2500);

    expect(autumn.calls).toEqual(["play@0", "pause", "play@0"]);
    expect(summer.calls).toEqual(["play@10", "pause"]);
  });

  it("starts both tracks where they are when seeking into the crossfade", async () => {
    const { player, summer, autumn, ready } = setUp();
    await ready();
    player.play();

    player.currentTime = 5;

    expect(summer.calls.at(-1)).toBe("play@15");
    expect(autumn.calls.at(-1)).toBe("play@1");
    expect(summer.volume).toBeCloseTo(0.5);
    expect(autumn.volume).toBeCloseTo(0.5);
  });

  it("only primes a track that is over, silently, when playing past it", async () => {
    const { player, summer, autumn, ready } = setUp();
    await ready();

    player.currentTime = 7;
    player.play();

    expect(autumn.calls).toEqual(["play@3"]);
    expect(summer.calls).toEqual(["play@10", "pause"]);
    expect(summer.volumesAtPlay).toEqual([0]);
  });

  it("pauses every sounding track on pause", async () => {
    const { player, summer, autumn, ready, advance } = setUp();
    await ready();
    player.play();
    advance(5000);

    player.pause();

    expect(summer.calls.at(-1)).toBe("pause");
    expect(autumn.calls.at(-1)).toBe("pause");
  });

  it("disposes every track when destroyed", async () => {
    const { player, summer, autumn, ready } = setUp();
    await ready();

    player.destroy();

    expect(summer.calls).toEqual(["dispose"]);
    expect(autumn.calls).toEqual(["dispose"]);
  });

  it("fails and pauses when the browser refuses to start the next track", async () => {
    const { player, autumn, ready, advance } = setUp();
    await ready();
    const failed = new Promise((resolve) =>
      player.addEventListener("error", resolve, { once: true }),
    );
    player.play();
    autumn.refuseNextPlay(new Error("not allowed"));

    advance(4000);
    await failed;

    expect(player.error?.name).toBe("MusicPlaybackError");
    expect(player.paused).toBe(true);
  });
});
