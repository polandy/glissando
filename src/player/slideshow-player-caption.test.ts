import { describe, expect, it } from "vitest";
import type { Slide, Slideshow } from "./slideshow";
import { SlideshowPlayer } from "./slideshow-player";
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
  formatVersion: 1,
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
  const player = new SlideshowPlayer(SLIDESHOW, {
    renderer,
    pictures,
    clock: new FakeClock(),
    frames: new FakeFrameScheduler(),
  });
  const shown = new Promise((resolve) => player.addEventListener("canplay", resolve));
  pictures.complete("a.jpg");
  pictures.complete("b.jpg");
  await shown;
  return { player, renderer };
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

  it("hands a new caption inset to the renderer and draws the frame again", async () => {
    const { player, renderer } = await readyPlayer();
    const framesBefore = renderer.frames.length;

    player.captionInset = 96;

    expect(player.captionInset).toBe(96);
    expect(renderer.captionInset).toBe(96);
    expect(renderer.frames.length).toBe(framesBefore + 1);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses a caption inset of %s CSS pixels",
    async (inset) => {
      const { player } = await readyPlayer();

      expect(() => (player.captionInset = inset)).toThrow(RangeError);
    },
  );
});
