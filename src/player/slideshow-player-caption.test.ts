import { describe, expect, it } from "vitest";
import type { Slide, Slideshow } from "./slideshow";
import { SlideshowPlayer } from "./slideshow-player";
import { CAPTION_GLIDE_MS, cssEase } from "./caption-glide";
import { FakeClock, FakeFrameScheduler, FakePictureLoader, FakeRenderer } from "./testing/fakes";

function slide(src: string, caption?: string): Slide {
  return {
    image: { src, capturedAt: "2025-07-01T10:00:00Z" },
    durationMs: 4000,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
    ...(caption === undefined ? {} : { caption }),
  };
}

const SLIDESHOW: Slideshow = {
  formatVersion: 2,
  title: "July 2025",
  slides: [
    {
      ...slide("a.jpg", "Evening on the jetty"),
      transitionToNext: { effect: "push-left", durationMs: 1000 },
    },
    slide("b.jpg"),
  ],
};

async function readyPlayer() {
  const pictures = new FakePictureLoader();
  const renderer = new FakeRenderer();
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const player = new SlideshowPlayer(SLIDESHOW, { renderer, pictures, clock, frames });
  const shown = new Promise((resolve) => player.addEventListener("canplay", resolve));
  pictures.complete("a.jpg");
  pictures.complete("b.jpg");
  await shown;
  return { player, renderer, clock, frames };
}

describe("SlideshowPlayer captions", () => {
  it("draws a slide with its caption, and one without none", async () => {
    const { player, renderer } = await readyPlayer();
    const seeked = new Promise((resolve) => player.addEventListener("seeked", resolve));

    player.currentTime = 3.5;
    await seeked;

    const frame = renderer.lastFrame;
    expect(frame?.kind).toBe("transition");
    expect(frame?.kind === "transition" && frame.from.caption).toBe("Evening on the jetty");
    expect(frame?.kind === "transition" && frame.to).not.toHaveProperty("caption");
  });

  it("starts with no caption inset", async () => {
    const { player, renderer } = await readyPlayer();

    expect(player.captionInset).toBe(0);
    expect(renderer.captionInset).toBe(0);
  });

  it("glides a new caption inset over the next frames while paused, then stops drawing", async () => {
    const { player, renderer, clock, frames } = await readyPlayer();
    const framesBefore = renderer.frames.length;

    player.captionInset = 96;

    expect(player.captionInset).toBe(96);
    expect(renderer.captionInset).toBe(0);
    clock.advance(CAPTION_GLIDE_MS / 2);
    frames.runFrame();
    expect(renderer.captionInset).toBeCloseTo(96 * cssEase(0.5), 10);
    clock.advance(CAPTION_GLIDE_MS / 2);
    frames.runFrame();
    expect(renderer.captionInset).toBe(96);
    expect(renderer.frames.length).toBe(framesBefore + 2);
    expect(frames.hasPendingFrame).toBe(false);
  });

  it("glides the caption inset with the frames of a playing player, without frames of its own", async () => {
    const { player, renderer, clock, frames } = await readyPlayer();
    player.play();
    const framesBefore = renderer.frames.length;

    player.captionInset = 96;
    clock.advance(CAPTION_GLIDE_MS / 2);
    frames.runFrame();

    expect(renderer.captionInset).toBeCloseTo(96 * cssEase(0.5), 10);
    expect(renderer.frames.length).toBe(framesBefore + 1);
  });

  it("finishes a glide after a pause halfway through it", async () => {
    const { player, renderer, clock, frames } = await readyPlayer();
    player.play();
    player.captionInset = 96;
    clock.advance(CAPTION_GLIDE_MS / 2);
    frames.runFrame();

    player.pause();
    clock.advance(CAPTION_GLIDE_MS / 2);
    frames.runFrame();

    expect(renderer.captionInset).toBe(96);
    expect(frames.hasPendingFrame).toBe(false);
  });

  it("jumps to a caption inset at once and draws the frame again, without frames to follow", async () => {
    const { player, renderer, frames } = await readyPlayer();
    const framesBefore = renderer.frames.length;

    player.jumpCaptionInset(96);

    expect(player.captionInset).toBe(96);
    expect(renderer.captionInset).toBe(96);
    expect(renderer.frames.length).toBe(framesBefore + 1);
    expect(frames.hasPendingFrame).toBe(false);
  });

  it("stops a glide when destroyed", async () => {
    const { player, frames } = await readyPlayer();
    player.captionInset = 96;
    expect(frames.hasPendingFrame).toBe(true);

    player.destroy();

    expect(frames.hasPendingFrame).toBe(false);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses a caption inset of %s CSS pixels",
    async (inset) => {
      const { player } = await readyPlayer();

      expect(() => (player.captionInset = inset)).toThrow(RangeError);
      expect(() => player.jumpCaptionInset(inset)).toThrow(RangeError);
    },
  );
});
