import { describe, expect, it } from "vitest";
import type { Size } from "../ken-burns";
import { BLUE, solidBitmap, standingStill } from "../testing/browser-pictures";
import { WebGlRenderer } from "./webgl-renderer";

const HD: Size = { width: 1280, height: 720 };
const UHD: Size = { width: 3840, height: 2160 };
const CAPTION = "HH Evening on the jetty";
/** A caption pixel: the white text, not the blue picture darkened by its gradient. */
const TEXT_RED_THRESHOLD = 200;

/** A renderer on a canvas in no document, as the video export draws. */
async function exportRenderer(drawingSize: Size) {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (gl === null) {
    throw new Error("this browser has no WebGL2");
  }
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, {
    pixelRatio: () => 1,
    drawingSize,
  });
  await renderer.captionFontLoaded;
  return { renderer, canvas, gl };
}

/** The caption text's bounding box as shares of the canvas: rows from the top, columns from the left. */
async function captionTextBox(drawingSize: Size) {
  const { renderer, canvas, gl } = await exportRenderer(drawingSize);
  const picture = await solidBitmap(BLUE);
  renderer.render({
    kind: "slide",
    slide: {
      picture,
      motion: standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 }),
      caption: CAPTION,
    },
  });
  const { width, height } = canvas;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let top = height;
  let bottom = 0;
  let right = 0;
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      if ((pixels[(row * width + column) * 4] ?? 0) > TEXT_RED_THRESHOLD) {
        // readPixels counts rows from the bottom.
        const fromTop = height - 1 - row;
        top = Math.min(top, fromTop);
        bottom = Math.max(bottom, fromTop);
        right = Math.max(right, column);
      }
    }
  }
  renderer.dispose();
  return {
    canvas: { width, height },
    textHeightShare: (bottom - top + 1) / height,
    textBottomShare: bottom / height,
    textRightShare: right / width,
  };
}

describe("WebGlRenderer with a fixed drawing size", () => {
  it("draws at exactly the drawing size, on a canvas laid out nowhere", async () => {
    const hd = await captionTextBox(HD);

    expect(hd.canvas).toEqual(HD);
  });

  it("scales the caption with the drawing size, so 720p and 4K frames look alike", async () => {
    const hd = await captionTextBox(HD);
    const uhd = await captionTextBox(UHD);

    expect(uhd.canvas).toEqual(UHD);
    expect(hd.textHeightShare).toBeGreaterThan(0.02);
    expect(uhd.textHeightShare).toBeCloseTo(hd.textHeightShare, 2);
    expect(uhd.textBottomShare).toBeCloseTo(hd.textBottomShare, 2);
    expect(uhd.textRightShare).toBeCloseTo(hd.textRightShare, 1);
  });
});
