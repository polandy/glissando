import { describe, expect, it } from "vitest";
import { SlideshowLoadError } from "./picture-buffer";
import { PLAYER_EVENTS } from "./player-events";
import type { Slide, Slideshow } from "./slideshow";
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
      to: { zoom: 2, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
  };
}

const SLIDESHOW: Slideshow = {
  formatVersion: 2,
  title: "July 2025",
  music: { src: "summer.mp3", startMs: 0, fadeInMs: 0, fadeOutMs: 0 },
  slides: [
    { ...slide("a.jpg", 4000), transitionToNext: { effect: "crossfade", durationMs: 1000 } },
    slide("b.jpg", 4000),
    slide("c.jpg", 4000),
  ],
};

function setUp() {
  const pictures = new FakePictureLoader();
  const renderer = new FakeRenderer();
  const frames = new FakeFrameScheduler();
  const music = new FakeMusic();
  const player = new SlideshowPlayer(SLIDESHOW, {
    renderer,
    pictures,
    clock: new FakeClock(),
    frames,
    music,
  });
  const events: string[] = [];
  for (const type of PLAYER_EVENTS) {
    player.addEventListener(type, () => events.push(type));
  }
  return { player, pictures, renderer, frames, music, events };
}

describe("SlideshowPlayer.renderAt", () => {
  it("resolves only once the frame's pictures are loaded, then has drawn that frame", async () => {
    const { player, pictures, renderer } = setUp();
    let resolved = false;

    const rendering = player.renderAt(3.5).then(() => (resolved = true));
    pictures.complete("a.jpg");
    await Promise.resolve();
    expect(resolved).toBe(false);
    pictures.complete("b.jpg");
    await rendering;

    const frame = renderer.lastFrame;
    expect(frame?.kind).toBe("transition");
    expect(frame?.kind === "transition" && frame.progress).toBeCloseTo(0.5);
    expect(player.currentTime).toBe(3.5);
  });

  it("clamps the time to the slideshow", async () => {
    const { player, pictures } = setUp();

    const rendering = player.renderAt(99);
    pictures.complete("c.jpg");
    await rendering;

    expect(player.currentTime).toBe(12);
  });

  it("prepares the upcoming pictures that are loaded after drawing", async () => {
    const { player, pictures, renderer } = setUp();
    const first = player.renderAt(0);
    pictures.complete("a.jpg");
    pictures.complete("b.jpg");
    await first;

    await player.renderAt(1);

    expect(renderer.prepared.map(({ picture }) => picture.src)).toContain("b.jpg");
  });

  it("emits no events, not even the first frame's canplay", async () => {
    const { player, pictures, renderer, events } = setUp();

    const rendering = player.renderAt(0);
    pictures.complete("a.jpg");
    pictures.complete("b.jpg");
    await rendering;

    expect(renderer.frames).toHaveLength(1);
    expect(events).toEqual([]);
  });

  it("pauses a playing player, silently, and its music", async () => {
    const { player, pictures, frames, music, events } = setUp();
    const shown = new Promise((resolve) => player.addEventListener("canplay", resolve));
    pictures.complete("a.jpg");
    pictures.complete("b.jpg");
    await shown;
    player.play();
    events.length = 0;

    await player.renderAt(2);

    expect(player.paused).toBe(true);
    expect(frames.hasPendingFrame).toBe(false);
    expect(music.calls.at(-1)).toBe("pause");
    expect(events).toEqual([]);
  });

  it("rejects with the load's error when a picture of the frame fails", async () => {
    const { player, pictures, events } = setUp();

    const rendering = player.renderAt(0);
    pictures.fail("a.jpg", new Error("gone"));

    await expect(rendering).rejects.toBeInstanceOf(SlideshowLoadError);
    expect(events).toEqual([]);
  });
});
