import { describe, expect, it } from "vitest";
import type { Slide, Slideshow } from "./slideshow";
import { PLAYER_EVENTS } from "./player-events";
import { SlideshowPlayer } from "./slideshow-player";
import {
  FakeClock,
  FakeFrameScheduler,
  FakeMusic,
  FakePictureLoader,
  FakeRenderer,
} from "./testing/fakes";

function slide(src: string, durationMs: number, transitionMs?: number): Slide {
  const base: Slide = {
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
  formatVersion: 1,
  title: "July 2025",
  music: { src: "summer.mp3" },
  slides: [slide("a.jpg", 4000, 1000), slide("b.jpg", 5000), slide("c.jpg", 3000)],
};

function nextEvent(target: EventTarget, type: string): Promise<Event> {
  return new Promise((resolve) => target.addEventListener(type, resolve, { once: true }));
}

function setUp() {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const pictures = new FakePictureLoader();
  const renderer = new FakeRenderer();
  const music = new FakeMusic();
  const player = new SlideshowPlayer(SLIDESHOW, { renderer, pictures, clock, frames, music });
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

describe("SlideshowPlayer", () => {
  it("starts paused at the beginning, lasting the sum of its slides in seconds", () => {
    const { player } = setUp();

    expect(player.duration).toBe(12);
    expect(player.currentTime).toBe(0);
    expect(player.paused).toBe(true);
    expect(player.ended).toBe(false);
  });

  it("shows the first frame as soon as its picture loaded, before playing", async () => {
    const { player, renderer, ready } = setUp();
    expect(player.ready).toBe(false);

    await ready();

    expect(player.ready).toBe(true);
    expect(renderer.lastFrame).toEqual({
      kind: "slide",
      slide: {
        picture: { src: "a.jpg", width: 1600, height: 900 },
        framing: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      },
    });
  });

  it("advances with the clock on every animation frame while playing", async () => {
    const { player, renderer, ready, advance } = setUp();
    await ready();

    player.play();
    advance(2000);

    expect(player.currentTime).toBe(2);
    expect(renderer.lastFrame).toMatchObject({ kind: "slide", slide: { framing: { zoom: 1.5 } } });
  });

  it("fires play and playing, and starts the music at the current time", async () => {
    const { player, events, music, ready } = setUp();
    await ready();

    player.play();

    expect(events).toEqual(["canplay", "play", "playing"]);
    expect(music.calls).toEqual(["play@0"]);
  });

  it("draws a transition with both pictures and eased progress", async () => {
    const { player, renderer, ready, advance } = setUp();
    await ready();

    player.play();
    advance(3250);

    expect(renderer.lastFrame).toMatchObject({
      kind: "transition",
      effect: "wipe-right",
      progress: 0.0625,
      from: { picture: { src: "a.jpg" } },
      to: { picture: { src: "b.jpg" }, framing: { zoom: 1 + 250 / 6000 } },
    });
  });

  it("holds the time on pause and pauses the music", async () => {
    const { player, events, music, ready, advance, frames } = setUp();
    await ready();
    player.play();
    advance(1000);

    player.pause();
    advance(1000);

    expect(player.currentTime).toBe(1);
    expect(player.paused).toBe(true);
    expect(frames.hasPendingFrame).toBe(false);
    expect(events.at(-1)).toBe("pause");
    expect(music.calls).toEqual(["play@0", "pause"]);
  });

  it("resumes the music where it paused", async () => {
    const { player, music, ready, advance } = setUp();
    await ready();
    player.play();
    advance(1500);
    player.pause();

    player.play();

    expect(music.calls.at(-1)).toBe("play@1.5");
  });

  it("draws the frame at a new time when seeking while paused", async () => {
    const { player, renderer, pictures, ready } = setUp();
    await ready();
    const seeked = nextEvent(player, "seeked");

    player.currentTime = 10.5;
    pictures.complete("c.jpg");
    await seeked;

    expect(player.paused).toBe(true);
    expect(renderer.lastFrame).toMatchObject({
      kind: "slide",
      slide: { picture: { src: "c.jpg" } },
    });
  });

  it.each([
    [-5, 0],
    [99, 12],
  ])("clamps a seek to %d s to %d s", async (requested, expected) => {
    const { player, ready } = setUp();
    await ready();

    player.currentTime = requested;

    expect(player.currentTime).toBe(expected);
  });

  it("continues from the new time and moves the music when seeking while playing", async () => {
    const { player, music, ready, advance } = setUp();
    await ready();
    player.play();
    advance(500);

    player.currentTime = 2;
    advance(1000);

    expect(player.currentTime).toBe(3);
    expect(music.calls.at(-1)).toBe("play@2");
  });

  it("stops at the end: ended, paused, music paused", async () => {
    const { player, events, music, pictures, ready, advance } = setUp();
    await ready();
    player.currentTime = 11;
    pictures.complete("c.jpg");
    await nextEvent(player, "seeked");
    player.play();

    advance(5000);

    expect(player.currentTime).toBe(12);
    expect(player.ended).toBe(true);
    expect(player.paused).toBe(true);
    expect(events.slice(-2)).toEqual(["pause", "ended"]);
    expect(music.calls.at(-1)).toBe("pause");
  });

  it("restarts from the beginning when played after the end", async () => {
    const { player, pictures, ready, advance } = setUp();
    await ready();
    player.currentTime = 11;
    pictures.complete("c.jpg");
    await nextEvent(player, "seeked");
    player.play();
    advance(5000);
    const playing = nextEvent(player, "playing");

    player.play();
    pictures.complete("a.jpg");
    await playing;

    expect(player.currentTime).toBe(0);
    expect(player.ended).toBe(false);
  });

  it("waits for a picture that is not loaded yet, then goes on from the same time", async () => {
    const { player, events, music, pictures, advance } = setUp();
    const shown = nextEvent(player, "canplay");
    pictures.complete("a.jpg");
    await shown;
    player.play();

    advance(3200);
    expect(player.currentTime).toBe(3.2);
    expect(events.at(-1)).toBe("waiting");
    expect(music.calls.at(-1)).toBe("pause");
    advance(1000);
    expect(player.currentTime).toBe(3.2);

    const playing = nextEvent(player, "playing");
    pictures.complete("b.jpg");
    await playing;
    advance(300);

    expect(player.currentTime).toBe(3.5);
    expect(music.calls.at(-1)).toBe("play@3.2");
  });

  it("preloads the next slide and releases the slides it has left behind", async () => {
    const { player, pictures, renderer, ready, advance } = setUp();
    await ready();
    expect(pictures.requested).toEqual(["a.jpg", "b.jpg"]);

    player.play();
    advance(5000);

    expect(pictures.requested).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(renderer.forgotten).toEqual(["a.jpg"]);
    expect(pictures.released).toEqual(["a.jpg"]);
  });

  it("releases a picture that arrives after the player moved past it", async () => {
    const { player, pictures } = setUp();
    const seeked = nextEvent(player, "seeked");
    player.currentTime = 10;
    pictures.complete("c.jpg");
    await seeked;

    const released = pictures.nextRelease();
    pictures.complete("a.jpg");
    expect(await released).toBe("a.jpg");
  });

  it("reports a picture that fails to load as an error and pauses", async () => {
    const { player, events, pictures } = setUp();
    const failed = nextEvent(player, "error");
    player.play();

    pictures.fail("a.jpg", new Error("decode failed"));
    await failed;

    expect(player.paused).toBe(true);
    expect(player.error?.message).toContain("a.jpg");
    expect(player.error?.cause).toEqual(new Error("decode failed"));
    expect(events).toEqual(["play", "waiting", "pause", "error"]);
  });

  it("reports music the browser refuses to play as an error and pauses", async () => {
    const { player, music, ready } = setUp();
    await ready();
    const refusal = new Error("NotAllowedError");
    music.refuseNextPlay(refusal);
    const failed = nextEvent(player, "error");

    player.play();
    await failed;

    expect(player.error?.cause).toBe(refusal);
    expect(player.paused).toBe(true);
  });

  it("frees everything on destroy and refuses to play afterwards", async () => {
    const { player, renderer, pictures, music, frames, ready } = setUp();
    await ready();
    player.play();

    player.destroy();

    expect(renderer.disposed).toBe(true);
    expect(pictures.released).toEqual(["a.jpg", "b.jpg"]);
    expect(music.calls.at(-1)).toBe("dispose");
    expect(frames.hasPendingFrame).toBe(false);
    expect(() => player.play()).toThrow(/destroyed/);
  });

  it("draws the current frame again on redraw, e.g. after a resize", async () => {
    const { player, renderer, ready } = setUp();
    await ready();
    const drawn = renderer.frames.length;

    player.redraw();

    expect(renderer.frames).toHaveLength(drawn + 1);
  });
});
