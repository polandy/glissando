import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { RenderFrame, SlideLayer } from "../ports";
import {
  BLUE,
  RED,
  solidBitmap,
  solidBitmapOfSize,
  standingStill,
  viewportBox,
  type Rgb,
} from "../testing/browser-pictures";
import { WebGlRenderer } from "./webgl-renderer";

const WHOLE_PICTURE = { zoom: 1, centerX: 0.5, centerY: 0.5 };
const STILL = standingStill(WHOLE_PICTURE);
const COLOUR_TOLERANCE = 10;
/** A picture's colour, darkened as the blurred fill's backdrop (ADR-0028). */
const BACKDROP_BRIGHTNESS = 0.55;

let box: HTMLElement;

function setUp(viewport: { width: number; height: number }) {
  box = viewportBox(viewport);
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (gl === null) {
    throw new Error("this browser has no WebGL2");
  }
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, { pixelRatio: () => 1 });
  const drawAndRead = (
    frame: RenderFrame<BitmapPicture>,
    xFromLeft: number,
    yFromTop: number,
  ): Rgb => {
    renderer.render(frame);
    const pixel = new Uint8Array(4);
    const x = Math.floor(xFromLeft * canvas.width);
    const y = Math.floor((1 - yFromTop) * canvas.height);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
  };
  return { drawAndRead };
}

function isColour(actual: Rgb, expected: Rgb, tolerance = COLOUR_TOLERANCE): boolean {
  return actual.every((channel, index) => Math.abs(channel - (expected[index] ?? 0)) <= tolerance);
}

afterEach(() => box.remove());

describe("WebGlRenderer: pairs and the blurred fill (ADR-0028)", () => {
  it("draws a pair side by side on a landscape screen, image left and partner right, with a black gap", async () => {
    const { drawAndRead } = setUp({ width: 200, height: 100 });
    const red = await solidBitmap(RED);
    const blue = await solidBitmap(BLUE);
    const layer: SlideLayer<BitmapPicture> = {
      kind: "picture",
      picture: red,
      motion: STILL,
      partner: { picture: blue, motion: STILL },
    };
    const frame: RenderFrame<BitmapPicture> = {
      kind: "slide",
      slide: layer,
      endFade: 0,
      look: "none",
    };

    expect(drawAndRead(frame, 0.2, 0.5)).toEqual(RED);
    expect(drawAndRead(frame, 0.8, 0.5)).toEqual(BLUE);
    expect(isColour(drawAndRead(frame, 0.5, 0.5), [0, 0, 0])).toBe(true);
  });

  it("stacks a pair on a portrait screen, image on top and partner below", async () => {
    const { drawAndRead } = setUp({ width: 100, height: 200 });
    const red = await solidBitmap(RED);
    const blue = await solidBitmap(BLUE);
    const layer: SlideLayer<BitmapPicture> = {
      kind: "picture",
      picture: red,
      motion: STILL,
      partner: { picture: blue, motion: STILL },
    };
    const frame: RenderFrame<BitmapPicture> = {
      kind: "slide",
      slide: layer,
      endFade: 0,
      look: "none",
    };

    expect(drawAndRead(frame, 0.5, 0.2)).toEqual(RED);
    expect(drawAndRead(frame, 0.5, 0.8)).toEqual(BLUE);
  });

  it("shows a portrait picture whole, over a darkened backdrop, on a 16:9 screen", async () => {
    const { drawAndRead } = setUp({ width: 1920, height: 1080 });
    // 3:4, far past the third-hidden threshold that switches cover to the blurred fill.
    const picture = await solidBitmapOfSize(RED, { width: 300, height: 400 });
    const frame: RenderFrame<BitmapPicture> = {
      kind: "slide",
      slide: { kind: "picture", picture, motion: STILL },
      endFade: 0,
      look: "none",
    };

    const middle = drawAndRead(frame, 0.5, 0.5);
    const side = drawAndRead(frame, 0.02, 0.5);

    expect(middle).toEqual(RED);
    expect(
      isColour(side, RED.map((channel) => channel * BACKDROP_BRIGHTNESS) as unknown as Rgb),
    ).toBe(true);
    expect(isColour(side, RED)).toBe(false);
  });

  it("covers the whole screen, no backdrop, when fit is cover", async () => {
    const { drawAndRead } = setUp({ width: 1920, height: 1080 });
    const picture = await solidBitmapOfSize(RED, { width: 300, height: 400 });
    const frame: RenderFrame<BitmapPicture> = {
      kind: "slide",
      slide: { kind: "picture", picture, motion: STILL, fit: "cover" },
      endFade: 0,
      look: "none",
    };

    expect(drawAndRead(frame, 0.02, 0.5)).toEqual(RED);
    expect(drawAndRead(frame, 0.98, 0.5)).toEqual(RED);
  });

  it("covers a 4:3 picture on a 16:9 screen without a backdrop: little enough of it is hidden", async () => {
    const { drawAndRead } = setUp({ width: 1920, height: 1080 });
    const picture = await solidBitmapOfSize(RED, { width: 400, height: 300 });
    const frame: RenderFrame<BitmapPicture> = {
      kind: "slide",
      slide: { kind: "picture", picture, motion: STILL },
      endFade: 0,
      look: "none",
    };

    expect(drawAndRead(frame, 0.02, 0.5)).toEqual(RED);
    expect(drawAndRead(frame, 0.98, 0.5)).toEqual(RED);
  });
});
