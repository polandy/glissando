import { afterEach, describe, expect, it, vi } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { RenderFrame, SlideLayer } from "../ports";
import type { Framing } from "../slideshow";
import { BLUE, RED, solidBitmap, viewportBox, type Rgb } from "../testing/browser-pictures";
import type { CaptionFonts } from "./caption-textures";
import { WebGlRenderer } from "./webgl-renderer";

const VIEWPORT = { width: 100, height: 100 };
const WHOLE_PICTURE: Framing = { zoom: 1, centerX: 0.5, centerY: 0.5 };
const COLOUR_TOLERANCE = 8;
/** Left of the text and below it: only the caption's gradient, at its darkest. */
const GRADIENT_CORNER = [0.005, 0.995] as const;
const ABOVE_THE_BAND = [0.005, 0.1] as const;
/** The gradient starts at half black: a blue picture shows about half its blue there. */
const DARKENED_BLUE: Rgb = [0, 0, 128];
const DARKENED_RED: Rgb = [128, 0, 0];
const CAPTION = "HH";

let box: HTMLElement;

/** Fonts the test lets load when it wants; `load` records each font asked for. */
class ControlledFonts implements CaptionFonts {
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

async function setUp({ fontsLoaded = true } = {}) {
  box = viewportBox(VIEWPORT);
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (gl === null) {
    throw new Error("this browser has no WebGL2");
  }
  const fonts = new ControlledFonts();
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, {
    pixelRatio: () => 1,
    fonts,
  });
  if (fontsLoaded) {
    fonts.finishLoading();
    await renderer.captionFontLoaded;
  }
  /** Reads straight after drawing, before the browser presents and clears the frame. */
  function drawAndRead(frame: RenderFrame<BitmapPicture>, [x, y]: readonly [number, number]) {
    renderer.render(frame);
    const pixel = new Uint8Array(4);
    gl?.readPixels(
      Math.floor(x * canvas.width),
      Math.floor((1 - y) * canvas.height),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel,
    );
    return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0] as const;
  }
  /** Every pixel's red channel in the bottom half, after drawing `frame`. */
  function bottomHalfReds(frame: RenderFrame<BitmapPicture>): number[] {
    renderer.render(frame);
    const half = canvas.height / 2;
    const pixels = new Uint8Array(canvas.width * half * 4);
    gl?.readPixels(0, 0, canvas.width, half, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return [...pixels].filter((_, index) => index % 4 === 0);
  }
  return { renderer, fonts, drawAndRead, bottomHalfReds, canvas, gl };
}

function isColour(actual: Rgb, expected: Rgb): boolean {
  return actual.every(
    (channel, index) => Math.abs(channel - (expected[index] ?? 0)) <= COLOUR_TOLERANCE,
  );
}

async function layer(colour: Rgb, caption?: string): Promise<SlideLayer<BitmapPicture>> {
  const picture = await solidBitmap(colour);
  return caption === undefined
    ? { picture, framing: WHOLE_PICTURE }
    : { picture, framing: WHOLE_PICTURE, caption };
}

async function slideFrame(colour: Rgb, caption?: string): Promise<RenderFrame<BitmapPicture>> {
  return { kind: "slide", slide: await layer(colour, caption) };
}

/** Resolves once `type` fires on `target`. */
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

afterEach(() => box.remove());

describe("WebGlRenderer captions", () => {
  it("lays the caption's gradient over the bottom left and leaves the top clear", async () => {
    const { drawAndRead } = await setUp();
    const frame = await slideFrame(BLUE, CAPTION);

    expect(drawAndRead(frame, ABOVE_THE_BAND)).toEqual(BLUE);
    expect(drawAndRead(frame, GRADIENT_CORNER)).toSatisfy((pixel: Rgb) =>
      isColour(pixel, DARKENED_BLUE),
    );
  });

  it("draws the caption's text in white", async () => {
    const { bottomHalfReds } = await setUp();

    const reds = bottomHalfReds(await slideFrame(BLUE, CAPTION));

    expect(reds.some((red) => red > 200)).toBe(true);
  });

  it("draws nothing over a slide without a caption", async () => {
    const { drawAndRead, bottomHalfReds } = await setUp();
    const frame = await slideFrame(BLUE);

    expect(drawAndRead(frame, ABOVE_THE_BAND)).toEqual(BLUE);
    expect(drawAndRead(frame, GRADIENT_CORNER)).toEqual(BLUE);
    expect(bottomHalfReds(frame).every((red) => red === 0)).toBe(true);
  });

  it("lifts the caption by the inset, in CSS pixels", async () => {
    const { renderer, drawAndRead } = await setUp();
    const frame = await slideFrame(BLUE, CAPTION);

    renderer.setCaptionInset(50);

    expect(drawAndRead(frame, GRADIENT_CORNER)).toEqual(BLUE);
    expect(drawAndRead(frame, [0.005, 0.495])).toSatisfy((pixel: Rgb) =>
      isColour(pixel, DARKENED_BLUE),
    );
  });

  it("pushes the caption in with its slide on push-left, not fixed on the screen", async () => {
    const { drawAndRead } = await setUp();
    const frame: RenderFrame<BitmapPicture> = {
      kind: "transition",
      effect: "push-left",
      progress: 0.5,
      from: await layer(RED),
      to: await layer(BLUE, CAPTION),
    };

    expect(drawAndRead(frame, GRADIENT_CORNER)).toEqual(RED);
    expect(drawAndRead(frame, [0.505, 0.995])).toSatisfy((pixel: Rgb) =>
      isColour(pixel, DARKENED_BLUE),
    );
  });

  it("fades the caption with its slide on crossfade", async () => {
    const { drawAndRead } = await setUp();
    const frame: RenderFrame<BitmapPicture> = {
      kind: "transition",
      effect: "crossfade",
      progress: 1,
      from: await layer(RED, CAPTION),
      to: await layer(BLUE),
    };

    expect(drawAndRead(frame, GRADIENT_CORNER)).toEqual(BLUE);
  });

  it("draws captions only once their font has loaded", async () => {
    const { fonts, renderer, drawAndRead } = await setUp({ fontsLoaded: false });
    const frame = await slideFrame(BLUE, CAPTION);

    expect(drawAndRead(frame, GRADIENT_CORNER)).toEqual(BLUE);
    expect(fonts.requested).toEqual(['600 16px "Instrument Sans", sans-serif']);

    fonts.finishLoading();
    await renderer.captionFontLoaded;

    expect(drawAndRead(frame, GRADIENT_CORNER)).toSatisfy((pixel: Rgb) =>
      isColour(pixel, DARKENED_BLUE),
    );
  });

  it("keeps the red picture under the caption's gradient", async () => {
    const { drawAndRead } = await setUp();

    expect(drawAndRead(await slideFrame(RED, CAPTION), GRADIENT_CORNER)).toSatisfy((pixel: Rgb) =>
      isColour(pixel, DARKENED_RED),
    );
  });

  it("deletes the caption's texture when its slide's picture is released", async () => {
    const { renderer, drawAndRead, gl } = await setUp();
    const frame = await slideFrame(BLUE, CAPTION);
    const created: WebGLTexture[] = [];
    const createTexture = gl.createTexture.bind(gl);
    vi.spyOn(gl, "createTexture").mockImplementation(() => {
      const texture = createTexture();
      created.push(texture);
      return texture;
    });
    drawAndRead(frame, GRADIENT_CORNER);
    expect(created.length).toBeGreaterThan(0);
    expect(created.every((texture) => gl.isTexture(texture))).toBe(true);

    if (frame.kind === "slide") {
      renderer.forget(frame.slide.picture);
    }

    expect(created.some((texture) => gl.isTexture(texture))).toBe(false);
  });

  it("draws the caption again once a lost WebGL context is restored", async () => {
    const { bottomHalfReds, canvas, gl } = await setUp();
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose === null) {
      throw new Error("this browser has no WEBGL_lose_context");
    }
    const frame = await slideFrame(BLUE, CAPTION);
    expect(bottomHalfReds(frame).some((red) => red > 200)).toBe(true);

    const lost = waitFor(canvas, "webglcontextlost");
    lose.loseContext();
    await lost;
    // The browser allows a restore only once the task dispatching the lost event has ended.
    await afterCurrentTask();
    const restored = waitFor(canvas, "webglcontextrestored");
    lose.restoreContext();
    // The renderer listened first, so it has rebuilt its resources by now.
    await restored;

    expect(bottomHalfReds(frame).some((red) => red > 200)).toBe(true);
  });
});
