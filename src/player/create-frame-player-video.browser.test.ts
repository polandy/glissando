import { describe, expect, it } from "vitest";
import { createFramePlayer } from "./create-frame-player";
import type { LiveFrame, VideoFrameSource } from "./ports";
import type { Slideshow } from "./slideshow";
import { BLUE, RED, solidCanvas, solidPicture } from "./testing/browser-pictures";

const SIZE = { width: 64, height: 36 };
const CLIP_START_MS = 2000;
const RENDERED_AT_SECONDS = 0.5;
const CHANNEL_TOLERANCE = 12;

async function videoSlideshow(): Promise<Slideshow> {
  const poster = await solidPicture(RED);
  return {
    formatVersion: 8,
    title: "Clip",
    slides: [
      {
        image: { src: poster.element.src, capturedAt: "2025-07-01T10:00:00Z" },
        durationMs: 1000,
        kenBurns: {
          from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
          to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
          easing: "linear",
        },
        video: { src: "clip.mp4", startMs: CLIP_START_MS, endMs: 3000, volume: 1 },
      },
    ],
  };
}

function centrePixel(canvas: HTMLCanvasElement): Uint8Array {
  const gl = canvas.getContext("webgl2");
  const pixel = new Uint8Array(4);
  gl?.readPixels(SIZE.width / 2, SIZE.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  return pixel;
}

describe("createFramePlayer with video slides", () => {
  it("draws the frame the injected source decodes for the clip time, not the poster", async () => {
    const requested: number[] = [];
    const opened: string[] = [];
    const source: VideoFrameSource = {
      frameAt: (clipMs) => {
        requested.push(clipMs);
        return Promise.resolve(solidCanvas(BLUE) as LiveFrame);
      },
      dispose: () => undefined,
    };
    const framePlayer = createFramePlayer(await videoSlideshow(), SIZE, undefined, (src) => {
      opened.push(src);
      return source;
    });
    if (framePlayer === null) {
      throw new Error("this browser has no WebGL2");
    }

    await framePlayer.player.renderAt(RENDERED_AT_SECONDS);

    expect(opened).toEqual(["clip.mp4"]);
    expect(requested).toEqual([CLIP_START_MS + RENDERED_AT_SECONDS * 1000]);
    const [red, , blue] = centrePixel(framePlayer.canvas);
    expect(blue).toBeGreaterThan(255 - CHANNEL_TOLERANCE);
    expect(red).toBeLessThan(CHANNEL_TOLERANCE);
    framePlayer.dispose();
  });

  it("draws the poster for a video slide when no frame source is given", async () => {
    const framePlayer = createFramePlayer(await videoSlideshow(), SIZE);
    if (framePlayer === null) {
      throw new Error("this browser has no WebGL2");
    }

    await framePlayer.player.renderAt(RENDERED_AT_SECONDS);

    const [red] = centrePixel(framePlayer.canvas);
    expect(red).toBeGreaterThan(255 - CHANNEL_TOLERANCE);
    framePlayer.dispose();
  });
});
