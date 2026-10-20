import { afterEach, describe, expect, it, vi } from "vitest";
import { createFramePlayer } from "./create-frame-player";
import type { Slideshow } from "./slideshow";
import { WebGlRenderer } from "./webgl/webgl-renderer";

const SLIDESHOW: Slideshow = {
  formatVersion: 8,
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

/** A closing card in the `classic` style, the simplest slideshow whose card needs an extra font. */
const SLIDESHOW_WITH_CARD: Slideshow = {
  formatVersion: 8,
  title: "Generated",
  slides: [
    {
      ground: "#000000",
      durationMs: 1000,
      card: {
        title: "The End",
        style: "classic",
        position: "centre",
        ink: "light",
        entrance: "rise",
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

  it("settles cardFontsLoaded at once without a card", async () => {
    const framePlayer = createFramePlayer(SLIDESHOW, { width: 64, height: 36 });
    if (framePlayer === null) {
      throw new Error("this browser has no WebGL2");
    }

    await expect(framePlayer.cardFontsLoaded).resolves.toBeUndefined();

    framePlayer.dispose();
  });

  describe("cardFontsLoaded", () => {
    afterEach(() => vi.restoreAllMocks());

    it("waits for every style the slideshow's cards use to load before settling, not before", async () => {
      let resolveStyleLoaded: () => void = () => undefined;
      const cardFontLoaded = vi.spyOn(WebGlRenderer.prototype, "cardFontLoaded").mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveStyleLoaded = resolve;
          }),
      );

      const framePlayer = createFramePlayer(SLIDESHOW_WITH_CARD, { width: 64, height: 36 });
      if (framePlayer === null) {
        throw new Error("this browser has no WebGL2");
      }
      let settled = false;
      void framePlayer.cardFontsLoaded.then(() => (settled = true));

      await Promise.resolve();
      await Promise.resolve();
      expect(settled).toBe(false);
      expect(cardFontLoaded).toHaveBeenCalledWith("classic");

      resolveStyleLoaded();
      await framePlayer.cardFontsLoaded;

      expect(settled).toBe(true);
      framePlayer.dispose();
    });
  });
});
