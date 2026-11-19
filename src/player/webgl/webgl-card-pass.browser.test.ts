import { afterEach, describe, expect, it } from "vitest";
import type { PixelPicture } from "../browser/pixel-loader";
import type { PictureSlideLayer, RenderFrame } from "../ports";
import { BLUE, solidPixels, standingStill } from "../testing/browser-pictures";
import {
  baseCard,
  cardVisual,
  groundLayer,
  setUpCardRenderer,
  WHOLE_PICTURE,
} from "./testing/card-render-fixtures";

let box: HTMLElement;
afterEach(() => box.remove());

function setUp() {
  const support = setUpCardRenderer();
  box = support.box;
  const { gl } = support;
  const counts = { framebufferBinds: 0, draws: 0 };
  const bindFramebuffer = gl.bindFramebuffer.bind(gl);
  gl.bindFramebuffer = (...args) => {
    counts.framebufferBinds += 1;
    bindFramebuffer(...args);
  };
  const drawArrays = gl.drawArrays.bind(gl);
  gl.drawArrays = (...args) => {
    counts.draws += 1;
    drawArrays(...args);
  };
  return { ...support, counts };
}

const pictureLayer = (): PictureSlideLayer<PixelPicture> => ({
  kind: "picture",
  picture: solidPixels(BLUE),
  motion: standingStill(WHOLE_PICTURE),
});

describe("WebGlRenderer card pass", () => {
  it("draws a picture without a card in one draw and no framebuffer switch", () => {
    const { renderer, counts } = setUp();
    const frame: RenderFrame<PixelPicture> = {
      kind: "slide",
      slide: pictureLayer(),
      endFade: 0,
      look: "none",
    };

    renderer.render(frame);

    expect(counts).toEqual({ framebufferBinds: 0, draws: 1 });
  });

  it("draws a card the player has not yet faded in without a card pass", () => {
    const { renderer, counts } = setUp();
    const frame: RenderFrame<PixelPicture> = {
      kind: "slide",
      slide: groundLayer(cardVisual(baseCard(), { textOpacity: 0 })),
      endFade: 0,
      look: "none",
    };

    renderer.render(frame);

    expect(counts).toEqual({ framebufferBinds: 0, draws: 1 });
  });

  it("still rasterises a visible card into its own framebuffer", () => {
    const { renderer, counts } = setUp();
    const frame: RenderFrame<PixelPicture> = {
      kind: "slide",
      slide: groundLayer(cardVisual(baseCard(), { textOpacity: 1, slideTimeMs: 5000 })),
      endFade: 0,
      look: "none",
    };

    renderer.render(frame);

    expect(counts.framebufferBinds).toBeGreaterThan(0);
  });
});
