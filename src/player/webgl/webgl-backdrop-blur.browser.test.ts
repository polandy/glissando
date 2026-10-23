import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import { standingStill, viewportBox } from "../testing/browser-pictures";
import { WebGlRenderer } from "./webgl-renderer";

const SCREEN = { width: 1920, height: 1080 };
/** Portrait, so the 16:9 screen shows it whole over its blurred fill (ADR-0028). */
const PICTURE = { width: 600, height: 800 };
const STRIPES = 8;
/** The backdrop's left band, left of the front picture (which starts 555 pixels in), in one row. */
const ROW_PIXELS = 540;
/** Compares the slope over this many pixels with the next ones: kinks of an upscaled coarse
 * image show as jumps in it, a soft blur changes it gradually. */
const SLOPE_STRIDE = 4;
/**
 * The soft blur changes its slope by at most 2 between strides, 8-bit rounding included; the
 * same backdrop read from one coarse mip level (texels 16 picture pixels wide) jumps by 7 at its
 * texel edges.
 */
const MAX_SLOPE_CHANGE = 3;
/** A blurred stripe pattern still varies across the row: the blur is not a flat colour. */
const MIN_RANGE = 10;
/**
 * A small bright dot left of the front picture, on the row `backdropRow` reads, far enough from
 * the picture's edge that its glow does not reach it.
 */
const DOT = { x: 90, y: PICTURE.height / 2, size: 24 };
/** The dot still lights its surroundings visibly once blurred and darkened. */
const MIN_DOT_PEAK = 4;
/**
 * A round glow is as bright at the same distance either side of its centre, 8-bit rounding
 * aside (1 measured); a disc of blur taps puts ghost copies of the dot off to one side, which
 * show there as a difference of 6 and a second rise.
 */
const MAX_ASYMMETRY = 2;

let box: HTMLElement;

afterEach(() => box.remove());

async function bitmapOf(draw: (context: CanvasRenderingContext2D) => void): Promise<BitmapPicture> {
  const canvas = document.createElement("canvas");
  canvas.width = PICTURE.width;
  canvas.height = PICTURE.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D canvas context to draw a test picture");
  }
  draw(context);
  const bitmap = await createImageBitmap(canvas);
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

function stripedBitmap(): Promise<BitmapPicture> {
  return bitmapOf((context) => {
    const stripe = PICTURE.width / STRIPES;
    for (let index = 0; index < STRIPES; index += 1) {
      context.fillStyle = index % 2 === 0 ? "black" : "white";
      context.fillRect(index * stripe, 0, stripe, PICTURE.height);
    }
  });
}

/** Black, with one small white dot. */
function dotBitmap(): Promise<BitmapPicture> {
  return bitmapOf((context) => {
    context.fillStyle = "black";
    context.fillRect(0, 0, PICTURE.width, PICTURE.height);
    context.fillStyle = "white";
    context.fillRect(DOT.x - DOT.size / 2, DOT.y - DOT.size / 2, DOT.size, DOT.size);
  });
}

function backdropRow(picture: BitmapPicture): number[] {
  box = viewportBox(SCREEN);
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (gl === null) {
    throw new Error("this browser has no WebGL2");
  }
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, { pixelRatio: () => 1 });
  renderer.render({
    kind: "slide",
    slide: {
      kind: "picture",
      picture,
      motion: standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 }),
    },
    endFade: 0,
    look: "none",
  });
  const pixels = new Uint8Array(ROW_PIXELS * 4);
  gl.readPixels(0, canvas.height / 2, ROW_PIXELS, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  return Array.from({ length: ROW_PIXELS }, (_, x) => pixels[x * 4] ?? 0);
}

describe("WebGlRenderer: the blurred fill's backdrop (ADR-0028)", () => {
  it("blurs the backdrop softly, without the kinks of an upscaled coarse image", async () => {
    const row = backdropRow(await stripedBitmap());

    const slopes = row
      .slice(SLOPE_STRIDE)
      .map((value, x) => value - (row[x] ?? 0))
      .filter((_, x) => x % SLOPE_STRIDE === 0);
    const slopeChanges = slopes
      .slice(1)
      .map((slope, index) => Math.abs(slope - (slopes[index] ?? 0)));

    expect(Math.max(...row) - Math.min(...row)).toBeGreaterThanOrEqual(MIN_RANGE);
    expect(Math.max(...slopeChanges)).toBeLessThanOrEqual(MAX_SLOPE_CHANGE);
  });

  it("spreads a bright dot into one round glow that fades steadily away from it, without ghost copies", async () => {
    const row = backdropRow(await dotBitmap());
    const brightest = Math.max(...row);
    const peak = Math.round((row.indexOf(brightest) + row.lastIndexOf(brightest)) / 2);

    const rightSide = row.slice(peak);
    const leftSide = row.slice(0, peak + 1).reverse();
    const rises = [leftSide, rightSide].flatMap((side) =>
      side.slice(1).filter((value, index) => value > (side[index] ?? 0)),
    );

    expect(row[peak]).toBeGreaterThanOrEqual(MIN_DOT_PEAK);
    expect(row[ROW_PIXELS - 1]).toBeLessThan(row[peak] ?? 0);
    const asymmetry = rightSide.map((value, distance) =>
      Math.abs(value - (leftSide[distance] ?? 0)),
    );

    expect(rises).toEqual([]);
    expect(Math.max(...asymmetry.slice(0, leftSide.length))).toBeLessThanOrEqual(MAX_ASYMMETRY);
  });
});
