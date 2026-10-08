import { afterEach, describe, expect, it } from "vitest";
import { createPlayer } from "../create-player";
import { RED, viewportBox, type Rgb } from "../testing/browser-pictures";
import { OPENED_PICTURE_SHOW, openingOnly, PICTURE_ID, redPng } from "../testing/opened-pictures";

function centrePixel([gl]: readonly WebGL2RenderingContext[]): Rgb {
  if (gl === undefined) {
    throw new Error("the player drew without asking for a WebGL2 context");
  }
  const pixel = new Uint8Array(4);
  gl.readPixels(
    Math.floor(gl.drawingBufferWidth / 2),
    Math.floor(gl.drawingBufferHeight / 2),
    1,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixel,
  );
  return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
}

let box: HTMLElement;
afterEach(() => box.remove());

describe("createPlayer with WebGL2 and openPicture", () => {
  it("draws a picture opened by id, uploaded as a WebGL texture", async () => {
    box = viewportBox({ width: 32, height: 32 });
    const contexts: WebGL2RenderingContext[] = [];
    const player = createPlayer(box, OPENED_PICTURE_SHOW, {
      webGl2Context: (canvas) => {
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
        if (gl === null) {
          throw new Error("this browser has no WebGL2");
        }
        contexts.push(gl);
        return gl;
      },
      openPicture: openingOnly(PICTURE_ID, await redPng()),
    });

    // Read in the drawing task itself, before the browser presents and clears the frame.
    const drawn = new Promise<Rgb>((resolve) =>
      player.addEventListener("canplay", () => resolve(centrePixel(contexts)), { once: true }),
    );

    expect(await drawn).toEqual(RED);
    player.destroy();
  });
});
