import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { RenderFrame } from "../ports";
import { BLUE, RED, standingStill, viewportBox, type Rgb } from "../testing/browser-pictures";
import { UPLOAD_PIXELS_PER_FRAME } from "./picture-textures";
import { WebGlRenderer } from "./webgl-renderer";

/** Twice the budget wide, so a slice is half the budget's rows and the picture three slices. */
const PICTURE = { width: 2048, height: 1200 };
/** Not on a slice boundary, so a slice taken from the wrong rows shows. */
const BAND_ROW = 700;
const COLOUR_TOLERANCE = 8;
const CAPTION = "HH";
/** Left of the caption's text and below it: only the caption's gradient, at its darkest. */
const GRADIENT_CORNER = { x: 0.005, y: 0.995 };
/** The gradient starts at half black: the blue bottom of the picture shows half its blue there. */
const DARKENED_BLUE: Rgb = [0, 0, 128];

let box: HTMLElement;
afterEach(() => box.remove());

/** Red above `BAND_ROW`, blue below. */
async function twoBandPicture(): Promise<BitmapPicture> {
  const canvas = new OffscreenCanvas(PICTURE.width, PICTURE.height);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D canvas context to draw a test picture");
  }
  context.fillStyle = "rgb(255 0 0)";
  context.fillRect(0, 0, PICTURE.width, BAND_ROW);
  context.fillStyle = "rgb(0 0 255)";
  context.fillRect(0, BAND_ROW, PICTURE.width, PICTURE.height - BAND_ROW);
  const bitmap = await createImageBitmap(canvas);
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

/** A renderer whose context records the pixels of every picture upload. */
function setUp() {
  box = viewportBox({ width: 100, height: 100 });
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (gl === null) {
    throw new Error("this browser has no WebGL2");
  }
  const uploads: number[] = [];
  /** One entry per caption rasterised and uploaded; captions are uploaded from a canvas. */
  const captionUploads: HTMLCanvasElement[] = [];
  const texSubImage2D = gl.texSubImage2D.bind(gl) as (...args: unknown[]) => void;
  gl.texSubImage2D = ((...args: unknown[]) => {
    if (args[8] instanceof ImageBitmap) {
      uploads.push(Number(args[4]) * Number(args[5]));
    }
    texSubImage2D(...args);
  }) as typeof gl.texSubImage2D;
  const texImage2D = gl.texImage2D.bind(gl) as (...args: unknown[]) => void;
  gl.texImage2D = ((...args: unknown[]) => {
    const source = args[5];
    if (source instanceof ImageBitmap) {
      uploads.push(source.width * source.height);
    }
    if (source instanceof HTMLCanvasElement) {
      captionUploads.push(source);
    }
    texImage2D(...args);
  }) as typeof gl.texImage2D;
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, { pixelRatio: () => 1 });
  function drawAndRead(frame: RenderFrame<BitmapPicture>, yFromTop: number, xFromLeft = 0.5): Rgb {
    renderer.render(frame);
    const pixel = new Uint8Array(4);
    const [x, y] = [Math.floor(xFromLeft * 100), Math.floor((1 - yFromTop) * 100)];
    gl?.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
  }
  return { renderer, uploads, captionUploads, drawAndRead };
}

function wholePicture(picture: BitmapPicture, caption?: string): RenderFrame<BitmapPicture> {
  const motion = standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 });
  return {
    kind: "slide",
    slide: caption === undefined ? { picture, motion } : { picture, motion, caption },
  };
}

function expectColour(actual: Rgb, expected: Rgb): void {
  actual.forEach((channel, index) => {
    expect(Math.abs(channel - (expected[index] ?? 0))).toBeLessThanOrEqual(COLOUR_TOLERANCE);
  });
}

describe("WebGlRenderer.prepare", () => {
  it("uploads a picture in slices no larger than the per-frame budget, so drawing it afterwards uploads nothing", async () => {
    const { renderer, uploads, drawAndRead } = setUp();
    const picture = await twoBandPicture();
    const pixels = PICTURE.width * PICTURE.height;
    const slices = Math.ceil(pixels / UPLOAD_PIXELS_PER_FRAME) + 1;

    for (let step = 0; step < slices + 1; step += 1) {
      renderer.prepare({ picture });
    }
    const uploadedWhilePreparing = uploads.splice(0);
    const top = drawAndRead(wholePicture(picture), 0.1);
    const bottom = drawAndRead(wholePicture(picture), 0.9);

    expect(uploadedWhilePreparing.length).toBeGreaterThan(1);
    expect(Math.max(...uploadedWhilePreparing)).toBeLessThanOrEqual(UPLOAD_PIXELS_PER_FRAME);
    expect(uploadedWhilePreparing.reduce((sum, slice) => sum + slice, 0)).toBe(pixels);
    expectColour(top, RED);
    expectColour(bottom, BLUE);
    expect(uploads).toEqual([]);
  });

  it("rasterises a slide's caption once its picture is uploaded, so drawing the captioned slide afterwards rasterises nothing", async () => {
    const { renderer, uploads, captionUploads, drawAndRead } = setUp();
    await renderer.captionFontLoaded;
    const picture = await twoBandPicture();
    // The picture's steps as the first case counts them, then one for the caption.
    const pictureSteps = Math.ceil((PICTURE.width * PICTURE.height) / UPLOAD_PIXELS_PER_FRAME) + 1;

    for (let step = 0; step < pictureSteps + 1; step += 1) {
      renderer.prepare({ picture, caption: CAPTION });
    }
    const rasterisedWhilePreparing = captionUploads.length;
    uploads.length = 0;
    captionUploads.length = 0;
    const band = drawAndRead(wholePicture(picture, CAPTION), GRADIENT_CORNER.y, GRADIENT_CORNER.x);

    expectColour(band, DARKENED_BLUE);
    expect(rasterisedWhilePreparing).toBe(1);
    expect(uploads).toEqual([]);
    expect(captionUploads).toEqual([]);
  });

  it("draws a picture prepared only in part by uploading the rest at once", async () => {
    const { renderer, uploads, drawAndRead } = setUp();
    const picture = await twoBandPicture();

    renderer.prepare({ picture });
    const top = drawAndRead(wholePicture(picture), 0.1);
    const bottom = drawAndRead(wholePicture(picture), 0.9);

    expectColour(top, RED);
    expectColour(bottom, BLUE);
    expect(uploads.reduce((sum, slice) => sum + slice, 0)).toBe(PICTURE.width * PICTURE.height);
  });
});
