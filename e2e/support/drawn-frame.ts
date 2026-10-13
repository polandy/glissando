import type { Locator, Page } from "@playwright/test";

/** A point on the player's frame, as fractions of its width and height from the top left. */
export interface FramePoint {
  readonly x: number;
  readonly y: number;
}

/** Side of the square of pixels around a point whose colour is read. */
const SAMPLE_SIZE = 4;

/**
 * Keeps what the player's WebGL canvas drew until it draws again, so a case reads the last drawn
 * frame from the canvas itself rather than from the screen: WebKit puts a frame drawn while
 * paused on screen only once the canvas draws again.
 */
export async function keepDrawnFrames(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      options?: unknown,
    ) {
      const kept =
        type === "webgl2" ? { ...(options as object), preserveDrawingBuffer: true } : options;
      return getContext.call(this, type, kept);
    } as typeof getContext;
  });
}

/**
 * The RGBA pixels around `point` of the player's last frame: read from its WebGL canvas (kept by
 * `keepDrawnFrames`), or from the screen when the DOM fallback player (no WebGL2) shows it.
 */
export async function framePixels(
  page: Page,
  player: Locator,
  point: FramePoint,
): Promise<number[]> {
  const canvas = player.locator("canvas");
  return (await canvas.count()) > 0 ? drawnPixels(canvas, point) : shownPixels(page, point);
}

/** The mean red, green and blue (0–255) of RGBA `pixels`. */
export function meanColour(pixels: readonly number[]): [number, number, number] {
  const sums = [0, 0, 0];
  for (let at = 0; at < pixels.length; at += 4) {
    for (let channel = 0; channel < sums.length; channel += 1) {
      sums[channel] = (sums[channel] ?? 0) + (pixels[at + channel] ?? 0);
    }
  }
  const count = pixels.length / 4;
  return [(sums[0] ?? 0) / count, (sums[1] ?? 0) / count, (sums[2] ?? 0) / count];
}

function drawnPixels(canvas: Locator, point: FramePoint): Promise<number[]> {
  return canvas.evaluate(
    (element: HTMLCanvasElement, { at, side }) => {
      const gl = element.getContext("webgl2");
      if (gl === null) {
        throw new Error("the player's canvas has no WebGL2 context");
      }
      const pixels = new Uint8Array(side * side * 4);
      // WebGL counts rows from the bottom.
      gl.readPixels(
        Math.round(gl.drawingBufferWidth * at.x - side / 2),
        Math.round(gl.drawingBufferHeight * (1 - at.y) - side / 2),
        side,
        side,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels,
      );
      return [...pixels];
    },
    { at: point, side: SAMPLE_SIZE },
  );
}

async function shownPixels(page: Page, point: FramePoint): Promise<number[]> {
  const viewport = page.viewportSize();
  if (viewport === null) {
    throw new Error("the page has no viewport to read");
  }
  const png = await page.screenshot({
    clip: {
      x: viewport.width * point.x - SAMPLE_SIZE / 2,
      y: viewport.height * point.y - SAMPLE_SIZE / 2,
      width: SAMPLE_SIZE,
      height: SAMPLE_SIZE,
    },
  });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("no 2D canvas context to read the screenshot");
    }
    context.drawImage(image, 0, 0);
    return [...context.getImageData(0, 0, canvas.width, canvas.height).data];
  }, png.toString("base64"));
}
