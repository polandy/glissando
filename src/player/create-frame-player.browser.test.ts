import { describe, expect, it, vi } from "vitest";
import { createFramePlayer } from "./create-frame-player";
import type { Fonts } from "./fonts";
import type { Slideshow } from "./slideshow";
import { settleMicrotasks } from "../testing/settle-microtasks";

const SLIDESHOW: Slideshow = {
  formatVersion: 9,
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
  formatVersion: 9,
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

/** Records each font asked for; every load settles only on `finishLoading`. */
class ControlledFonts implements Fonts {
  readonly requested: string[] = [];
  #resolve: () => void = () => undefined;
  readonly #loaded = new Promise<void>((resolve) => (this.#resolve = resolve));
  load(font: string): Promise<unknown> {
    this.requested.push(font);
    return this.#loaded;
  }
  finishLoading(): void {
    this.#resolve();
  }
}

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

  it("asks for the context release once on dispose, leaving it to the renderer", () => {
    const framePlayer = createFramePlayer(SLIDESHOW, { width: 64, height: 36 });
    if (framePlayer === null) {
      throw new Error("this browser has no WebGL2");
    }
    const gl = framePlayer.canvas.getContext("webgl2");
    if (gl === null) {
      throw new Error("this browser has no WebGL2");
    }
    const getExtension = vi.spyOn(gl, "getExtension");

    framePlayer.dispose();

    expect(gl.isContextLost()).toBe(true);
    expect(
      getExtension.mock.calls.filter(([name]) => (name as string) === "WEBGL_lose_context"),
    ).toHaveLength(1);
  });

  it("settles cardFontsLoaded at once without a card", async () => {
    const framePlayer = createFramePlayer(SLIDESHOW, { width: 64, height: 36 });
    if (framePlayer === null) {
      throw new Error("this browser has no WebGL2");
    }

    await expect(framePlayer.cardFontsLoaded).resolves.toBeUndefined();

    framePlayer.dispose();
  });

  it("waits for every style the slideshow's cards use to load before settling, not before", async () => {
    const fonts = new ControlledFonts();
    const framePlayer = createFramePlayer(
      SLIDESHOW_WITH_CARD,
      { width: 64, height: 36 },
      { fonts },
    );
    if (framePlayer === null) {
      throw new Error("this browser has no WebGL2");
    }
    let settled = false;
    void framePlayer.cardFontsLoaded.then(() => (settled = true));

    await settleMicrotasks();
    expect(settled).toBe(false);
    expect(fonts.requested.some((font) => font.includes("Instrument Serif"))).toBe(true);

    fonts.finishLoading();
    await framePlayer.cardFontsLoaded;

    expect(settled).toBe(true);
    framePlayer.dispose();
  });
});
