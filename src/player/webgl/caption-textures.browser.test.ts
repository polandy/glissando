import { afterEach, describe, expect, it, vi } from "vitest";
import { CaptionTextures } from "./caption-textures";

const VIEWPORT = { width: 200, height: 100 };
const CAPTION = "Abends am Steg";
const loadedFonts = { load: () => Promise.resolve() };

let textures: CaptionTextures | undefined;
afterEach(() => textures?.dispose());

async function setUp() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  if (gl === null) {
    throw new Error("this browser has no WebGL2");
  }
  let pixelRatio = 1;
  textures = new CaptionTextures(
    gl,
    loadedFonts,
    () => pixelRatio,
    () => undefined,
  );
  await textures.fontLoaded;
  /** Counts the captions drawn into a texture, i.e. uploads from the raster canvas. */
  const uploads = vi.spyOn(gl, "texImage2D");
  const rasterized = () =>
    uploads.mock.calls.filter((call) => call.at(-1) instanceof HTMLCanvasElement).length;
  return {
    gl,
    textures,
    rasterized,
    setPixelRatio: (ratio: number) => (pixelRatio = ratio),
  };
}

describe("CaptionTextures", () => {
  it("draws a caption once and reuses its texture while nothing changes", async () => {
    const { textures, rasterized } = await setUp();
    const owner = {};

    const first = textures.texture(owner, CAPTION, VIEWPORT);
    const again = textures.texture(owner, CAPTION, VIEWPORT);

    expect(again).toBe(first);
    expect(rasterized()).toBe(1);
  });

  it("deletes a caption's texture when its slide's picture is released", async () => {
    const { gl, textures } = await setUp();
    const kept = {};
    const released = {};
    const keptTexture = textures.texture(kept, CAPTION, VIEWPORT);
    const releasedTexture = textures.texture(released, CAPTION, VIEWPORT);

    textures.forget(released);

    expect(gl.isTexture(keptTexture)).toBe(true);
    expect(gl.isTexture(releasedTexture)).toBe(false);
  });

  it("draws the caption again after the viewport is resized", async () => {
    const { textures, rasterized } = await setUp();
    const owner = {};
    textures.texture(owner, CAPTION, VIEWPORT);

    textures.texture(owner, CAPTION, { width: 300, height: 150 });

    expect(rasterized()).toBe(2);
  });

  it("draws the caption again when the pixel ratio changes at the same buffer size", async () => {
    const { textures, rasterized, setPixelRatio } = await setUp();
    const owner = {};
    textures.texture(owner, CAPTION, VIEWPORT);

    setPixelRatio(2);
    textures.texture(owner, CAPTION, VIEWPORT);

    expect(rasterized()).toBe(2);
  });

  it("draws the caption again after its text changes", async () => {
    const { textures, rasterized } = await setUp();
    const owner = {};
    textures.texture(owner, CAPTION, VIEWPORT);

    textures.texture(owner, "Am Morgen", VIEWPORT);

    expect(rasterized()).toBe(2);
  });
});
