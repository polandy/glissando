import { describe, expect, it } from "vitest";
import { createFramePlayer } from "./create-frame-player";
import type { Slideshow } from "./slideshow";

const SLIDESHOW: Slideshow = {
  formatVersion: 2,
  title: "Generated",
  slides: [
    {
      image: { src: "unused.jpg", capturedAt: "2025-07-01T10:00:00Z" },
      durationMs: 1000,
      kenBurns: {
        from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        easing: "linear",
      },
    },
  ],
};

describe("createFramePlayer", () => {
  it("gives its WebGL context back on dispose, so repeated exports never exhaust the browser's contexts", () => {
    const framePlayer = createFramePlayer(SLIDESHOW, { width: 64, height: 36 });
    if (framePlayer === null) {
      throw new Error("this browser has no WebGL2");
    }
    const gl = framePlayer.canvas.getContext("webgl2");
    expect(gl?.isContextLost()).toBe(false);

    framePlayer.dispose();

    expect(gl?.isContextLost()).toBe(true);
  });
});
