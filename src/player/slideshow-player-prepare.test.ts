import { describe, expect, it } from "vitest";
import type { Slide, Slideshow } from "./slideshow";
import { SlideshowPlayer } from "./slideshow-player";
import { FakeClock, FakeFrameScheduler, FakePictureLoader, FakeRenderer } from "./testing/fakes";

const FRAME_MS = 1000 / 60;
const FULL_UPLOAD_MS = 100;
const SLICE_MS = 2;
const SLICES_PER_PICTURE = 4;
/** Room for floating-point sums of frame intervals. */
const EPSILON_MS = 1e-6;

function slide(src: string, durationMs: number, extra: Partial<Slide> = {}): Slide {
  return {
    image: { src, capturedAt: "2025-07-01T10:00:00Z" },
    durationMs,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 2, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
    ...extra,
  };
}

/** a: 0–4 s, wipe into b from 3 s; b: 4–9 s; c: 9–12 s. */
const SLIDESHOW: Slideshow = {
  formatVersion: 2,
  title: "July 2025",
  slides: [
    slide("a.jpg", 4000, { transitionToNext: { effect: "wipe-right", durationMs: 1000 } }),
    slide("b.jpg", 5000, { caption: "Sunset at the lake" }),
    slide("c.jpg", 3000),
  ],
};

function nextEvent(target: EventTarget, type: string): Promise<Event> {
  return new Promise((resolve) => target.addEventListener(type, resolve, { once: true }));
}

/** Lets settled loads reach the player; only microtasks run, no time passes. */
async function settleLoads(): Promise<void> {
  for (let hop = 0; hop < 5; hop += 1) {
    await Promise.resolve();
  }
}

/** A player whose renderer charges the clock for uploads, with the show time of every frame drawn. */
async function playerReadyToPlay() {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const pictures = new FakePictureLoader();
  const renderer = new FakeRenderer({
    clock,
    fullUploadMs: FULL_UPLOAD_MS,
    sliceMs: SLICE_MS,
    slicesPerPicture: SLICES_PER_PICTURE,
  });
  const player = new SlideshowPlayer(SLIDESHOW, { renderer, pictures, clock, frames });
  const drawnAtMs: number[] = [];
  renderer.onRender = () => drawnAtMs.push(player.currentTime * 1000);
  const shown = nextEvent(player, "canplay");
  pictures.complete("a.jpg");
  pictures.complete("b.jpg");
  await shown;
  drawnAtMs.length = 0;
  return { clock, frames, pictures, renderer, player, drawnAtMs };
}

function steps(times: readonly number[]): number[] {
  return times.slice(1).map((time, index) => time - (times[index] ?? time));
}

describe("SlideshowPlayer preparing pictures", () => {
  it("keeps every frame's Ken Burns step within one frame interval while the next picture is prepared", async () => {
    const { clock, frames, pictures, player, drawnAtMs } = await playerReadyToPlay();
    const waits: string[] = [];
    player.addEventListener("waiting", () => waits.push("waiting"));

    player.play();
    while (!player.ended) {
      clock.advance(FRAME_MS);
      frames.runFrame();
      if (pictures.requested.includes("c.jpg") && !pictures.completed.includes("c.jpg")) {
        pictures.complete("c.jpg");
      }
      await settleLoads();
    }

    expect(waits).toEqual([]);
    expect(drawnAtMs.length).toBeGreaterThan(12_000 / (FRAME_MS + SLICE_MS));
    const frameSteps = steps(drawnAtMs);
    expect(Math.min(...frameSteps)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...frameSteps)).toBeLessThanOrEqual(FRAME_MS + SLICE_MS + EPSILON_MS);
  });

  it("starts the motion clock after the first frame is drawn", async () => {
    const { clock, frames, pictures, player, drawnAtMs } = await playerReadyToPlay();
    player.play();
    clock.advance(FRAME_MS);
    frames.runFrame();

    player.currentTime = 10;
    const playing = nextEvent(player, "playing");
    pictures.complete("c.jpg");
    await playing;
    clock.advance(FRAME_MS);
    frames.runFrame();

    expect(drawnAtMs.slice(-2)).toEqual([10_000, expect.closeTo(10_000 + FRAME_MS, 6)]);
  });

  it("prepares the buffered picture after the one on screen, with its caption, after each frame", async () => {
    const { clock, frames, renderer, player } = await playerReadyToPlay();
    player.play();
    clock.advance(FRAME_MS);
    frames.runFrame();

    expect(renderer.prepared.at(-1)).toEqual({
      picture: expect.objectContaining({ src: "b.jpg" }),
      caption: "Sunset at the lake",
    });
    expect(renderer.prepared.map(({ picture }) => picture.src)).not.toContain("a.jpg");
  });
});
