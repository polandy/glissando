import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { RenderFrame } from "../ports";
import {
  baseCard,
  cardVisual,
  everyPixelIsGround,
  groundLayer,
  GROUND_COLOUR,
  setUpCardRenderer,
} from "./testing/card-render-fixtures";

let box: HTMLElement;
afterEach(() => box.remove());

function waitFor(target: EventTarget, type: string): Promise<void> {
  return new Promise((resolve) => target.addEventListener(type, () => resolve(), { once: true }));
}

/** Resolves in a later task, once the one now running has finished. */
function afterCurrentTask(): Promise<void> {
  const channel = new MessageChannel();
  return new Promise((resolve) => {
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}

describe("WebGlRenderer card layers across a lost WebGL context", () => {
  it("draws a card's words again once the context is restored", async () => {
    let resolveResize: () => void = () => undefined;
    const resized = new Promise<void>((resolve) => (resolveResize = resolve));
    const support = setUpCardRenderer({ onResize: () => resolveResize() });
    box = support.box;
    const { renderer, readAllPixels, canvas, gl } = support;
    await renderer.cardFontLoaded("modern");
    const frame: RenderFrame<BitmapPicture> = {
      kind: "slide",
      slide: groundLayer(
        cardVisual(baseCard({ title: "Summer Lake", entrance: "words" }), {
          textOpacity: 1,
          slideTimeMs: 3000,
        }),
      ),
      endFade: 0,
      look: "none",
    };
    expect(everyPixelIsGround(readAllPixels(frame), GROUND_COLOUR)).toBe(false);

    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose === null) {
      throw new Error("this browser has no WEBGL_lose_context");
    }
    const lost = waitFor(canvas, "webglcontextlost");
    lose.loseContext();
    await lost;
    await afterCurrentTask();
    const restored = waitFor(canvas, "webglcontextrestored");
    lose.restoreContext();
    await restored;
    await resized;

    expect(everyPixelIsGround(readAllPixels(frame), GROUND_COLOUR)).toBe(false);
  });
});
