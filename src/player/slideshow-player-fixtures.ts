import type { PictureSlide, Slideshow } from "./slideshow";
import { PLAYER_EVENTS } from "./player-events";
import { SlideshowPlayer } from "./slideshow-player";
import {
  FakeClock,
  FakeFrameScheduler,
  FakeMusic,
  FakePictureLoader,
  FakeRenderer,
} from "./testing/fakes";

export function slide(src: string, durationMs: number, transitionMs?: number): PictureSlide {
  const base: PictureSlide = {
    image: { src, capturedAt: "2025-07-01T10:00:00Z" },
    durationMs,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 2, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
  };
  return transitionMs === undefined
    ? base
    : { ...base, transitionToNext: { effect: "wipe-right", durationMs: transitionMs } };
}

/** a: 0–4 s, wipe into b from 3 s; b: 4–9 s; c: 9–12 s. */
const SLIDESHOW: Slideshow = {
  formatVersion: 7,
  title: "July 2025",
  music: [{ src: "summer.mp3", atMs: 0, startMs: 0, endMs: 600_000, fadeInMs: 0, fadeOutMs: 0 }],
  slides: [slide("a.jpg", 4000, 1000), slide("b.jpg", 5000), slide("c.jpg", 3000)],
};

export function nextEvent(target: EventTarget, type: string): Promise<Event> {
  return new Promise((resolve) => target.addEventListener(type, resolve, { once: true }));
}

export function setUp(options: { readonly picturesAhead?: number } = {}) {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const pictures = new FakePictureLoader();
  const renderer = new FakeRenderer();
  const music = new FakeMusic();
  const player = new SlideshowPlayer(SLIDESHOW, {
    renderer,
    pictures,
    clock,
    frames,
    openMusic: () => music,
    ...options,
  });
  const events: string[] = [];
  for (const type of PLAYER_EVENTS) {
    if (type !== "timeupdate") {
      player.addEventListener(type, () => events.push(type));
    }
  }
  return {
    player,
    clock,
    frames,
    pictures,
    renderer,
    music,
    events,
    /** Loads the pictures the first frames need and waits for the first frame. */
    async ready() {
      const shown = nextEvent(player, "canplay");
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
