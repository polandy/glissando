import { describe, expect, it } from "vitest";
import { PLAYER_EVENTS } from "./player-events";
import { SlideshowPlayer } from "./slideshow-player";
import type { Card, GroundSlide, PictureSlide, Slideshow } from "./slideshow";
import {
  FakeClock,
  FakeFrameScheduler,
  FakeMusic,
  FakePictureLoader,
  FakeRenderer,
} from "./testing/fakes";

const OPENING_CARD: Card = {
  title: "Summer at the Lake",
  style: "modern",
  position: "centre",
  ink: "light",
  entrance: "rise",
};

function pictureTitleSlide(): PictureSlide {
  return {
    image: { src: "a.jpg", capturedAt: "2026-06-01T10:00:00Z" },
    durationMs: 4000,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
    card: OPENING_CARD,
  };
}

function groundTitleSlide(): GroundSlide {
  return { ground: "#101010", durationMs: 4000, card: OPENING_CARD };
}

function nextSlide(src: string): PictureSlide {
  return {
    image: { src, capturedAt: "2026-06-01T10:00:00Z" },
    durationMs: 3000,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
  };
}

/**
 * Lets a chain of already-settled promises (e.g. a ground slide's own, picture-less load)
 * run to the end, without any wall-clock wait: each step is one microtask turn, and the chain
 * involved here is a handful of turns deep, so this leaves a comfortable margin.
 */
async function settleOwnLoad(): Promise<void> {
  for (let turn = 0; turn < 8; turn += 1) {
    await Promise.resolve();
  }
}

function setUp(slides: Slideshow["slides"]) {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const pictures = new FakePictureLoader();
  const renderer = new FakeRenderer();
  const music = new FakeMusic();
  const slideshow: Slideshow = {
    formatVersion: 6,
    title: "Test",
    slides,
    music: [{ src: "summer.mp3", atMs: 0, startMs: 0, endMs: 600_000, fadeInMs: 0, fadeOutMs: 0 }],
  };
  const player = new SlideshowPlayer(slideshow, {
    renderer,
    pictures,
    clock,
    frames,
    openMusic: () => music,
  });
  const events: string[] = [];
  for (const type of PLAYER_EVENTS) {
    if (type !== "timeupdate") {
      player.addEventListener(type, () => events.push(type));
    }
  }
  const playing = new Promise<void>((resolve) =>
    player.addEventListener("playing", () => resolve(), { once: true }),
  );
  return { player, clock, frames, pictures, renderer, music, events, playing };
}

describe("SlideshowPlayer, holding playback for the opening slide's own card", () => {
  it("holds the clock and the music while a picture title slide's picture is still decoding", () => {
    const { player, music } = setUp([pictureTitleSlide(), nextSlide("b.jpg")]);

    player.play();

    expect(player.currentTime).toBe(0);
    expect(music.calls).toEqual([]);
  });

  it("holds the clock and the music while a picture title slide's picture is in but its card font is not", async () => {
    const { player, pictures, music, events } = setUp([pictureTitleSlide(), nextSlide("b.jpg")]);

    player.play();
    pictures.complete("a.jpg");
    await pictures.settled("a.jpg");
    await Promise.resolve();

    expect(player.currentTime).toBe(0);
    expect(music.calls).toEqual([]);
    expect(events).not.toContain("playing");
  });

  it("plays from t=0 with the music, once a picture title slide's picture and card are both ready", async () => {
    const { player, pictures, renderer, music, playing } = setUp([
      pictureTitleSlide(),
      nextSlide("b.jpg"),
    ]);

    player.play();
    pictures.complete("a.jpg");
    renderer.completeCard(OPENING_CARD);
    await playing;

    expect(player.currentTime).toBe(0);
    expect(music.calls).toEqual(["play@0"]);
  });

  it("holds a ground title slide until its own card is ready, without waiting on the next picture", async () => {
    const { player, pictures, music } = setUp([groundTitleSlide(), nextSlide("b.jpg")]);

    player.play();
    await settleOwnLoad();

    expect(player.currentTime).toBe(0);
    expect(music.calls).toEqual([]);
    // Loading starts regardless, so the next slide is ready by the time it is needed.
    expect(pictures.requested).toContain("b.jpg");
  });

  it("starts a ground title slide once its own card is ready, even with the next picture still decoding", async () => {
    const { player, renderer, music, playing } = setUp([groundTitleSlide(), nextSlide("b.jpg")]);

    player.play();
    await settleOwnLoad();
    renderer.completeCard(OPENING_CARD);
    await playing;

    expect(player.currentTime).toBe(0);
    expect(music.calls).toEqual(["play@0"]);
  });
});
