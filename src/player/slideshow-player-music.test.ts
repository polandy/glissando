import { describe, expect, it } from "vitest";
import type { Music, Slide, Slideshow } from "./slideshow";
import { SlideshowPlayer } from "./slideshow-player";
import {
  FakeClock,
  FakeFrameScheduler,
  FakeMusic,
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

/** Heard from 10 s to 16 s of the track: 6 s of the 12 s slideshow, fading in 2 s and out 2 s. */
const MUSIC: Music = {
  src: "summer.mp3",
  startMs: 10_000,
  endMs: 16_000,
  fadeInMs: 2000,
  fadeOutMs: 2000,
};

function setUp() {
  const slideshow: Slideshow = {
    formatVersion: 2,
    title: "July 2025",
    music: MUSIC,
    slides: [slide("a.jpg", 4000), slide("b.jpg", 4000), slide("c.jpg", 4000)],
  };
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const pictures = new FakePictureLoader();
  const music = new FakeMusic();
  const player = new SlideshowPlayer(slideshow, {
    renderer: new FakeRenderer(),
    pictures,
    clock,
    frames,
    music,
  });
  return {
    player,
    music,
    pictures,
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

describe("SlideshowPlayer with trimmed, faded music", () => {
  it("starts the music at the excerpt's start, silent at the start of its fade-in", async () => {
    const { player, music, ready } = setUp();
    await ready();

    player.play();

    expect(music.calls).toEqual(["play@10"]);
    expect(music.volume).toBe(0);
  });

  it("follows the fade-in on every frame", async () => {
    const { player, music, ready, advance } = setUp();
    await ready();
    player.play();

    advance(1000);

    expect(music.volume).toBeCloseTo(0.5);
  });

  it("maps a seek into the excerpt and sets the volume there before playing on", async () => {
    const { player, music, ready, advance } = setUp();
    await ready();
    player.play();
    advance(500);

    player.currentTime = 5;

    expect(music.calls.at(-1)).toBe("play@15");
    expect(music.volume).toBeCloseTo(0.5);
  });

  it("resumes at the volume it paused at, without a jump", async () => {
    const { player, music, ready, advance } = setUp();
    await ready();
    player.play();
    advance(1500);
    player.pause();

    player.play();

    expect(music.calls).toEqual(["play@10", "pause", "play@11.5"]);
    expect(music.volume).toBeCloseTo(0.75);
  });

  it("pauses the music once it is no longer heard, while the pictures play on", async () => {
    const { player, music, ready, advance } = setUp();
    await ready();
    player.play();
    advance(5000);
    expect(music.calls).toEqual(["play@10"]);

    advance(1500);

    expect(player.paused).toBe(false);
    expect(music.calls).toEqual(["play@10", "pause"]);
  });

  it("stays silent when played past the music's end", async () => {
    const { player, music, pictures, ready } = setUp();
    await ready();
    const playing = new Promise((resolve) =>
      player.addEventListener("playing", resolve, { once: true }),
    );
    player.currentTime = 8;
    player.play();

    pictures.complete("c.jpg");
    await playing;

    expect(player.currentTime).toBe(8);
    expect(music.calls).toEqual([]);
  });
});
