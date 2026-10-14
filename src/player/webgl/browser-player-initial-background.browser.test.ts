import { afterEach, describe, expect, it } from "vitest";
import { createPlayer } from "../create-player";
import type { GroundSlide, PictureSlide, Slideshow } from "../slideshow";
import { viewportBox } from "../testing/browser-pictures";

/** `#2A2340`'s RGB. */
const TINT_RGB = [42, 35, 64];

let box: HTMLElement;
afterEach(() => box.remove());

function groundTitleSlide(): GroundSlide {
  return {
    ground: "#2A2340",
    durationMs: 4000,
    card: {
      title: "Summer at the Lake",
      style: "modern",
      position: "centre",
      ink: "light",
      entrance: "rise",
      enterAtMs: 0,
    },
  };
}

function veiledPictureTitleSlide(): PictureSlide {
  return {
    image: { src: "a.jpg", capturedAt: "2026-06-01T10:00:00Z" },
    durationMs: 6000,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
    card: {
      title: "Summer at the Lake",
      style: "modern",
      position: "centre",
      ink: "light",
      entrance: "rise",
      enterAtMs: 0,
      revealAtMs: 2400,
      veil: { amount: 0.6, tint: "#2A2340" },
    },
  };
}

function nextSlide(): PictureSlide {
  return {
    image: { src: "b.jpg", capturedAt: "2026-06-01T10:00:00Z" },
    durationMs: 3000,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
  };
}

/** The canvas's own pixel, read the instant `createPlayer` returns: no frame has drawn or
 * composited yet, so there is no risk of the browser having cleared the buffer in between. */
function centrePixel(): readonly [number, number, number] {
  const canvas = box.querySelector("canvas");
  if (canvas === null) {
    throw new Error("no canvas; DOM fallback renderer?");
  }
  const gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
  if (gl === null) {
    throw new Error("no webgl2 context on the canvas");
  }
  const pixel = new Uint8Array(4);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
}

describe("the opening slide's colour, right as the player is created", () => {
  it("shows the ground colour before the title slide's own picture (there is none) ever loads", () => {
    box = viewportBox({ width: 160, height: 90 });
    const slideshow: Slideshow = {
      formatVersion: 6,
      title: "T",
      slides: [groundTitleSlide(), nextSlide()],
    };

    createPlayer(box, slideshow);

    expect(centrePixel()).toEqual(TINT_RGB);
  });

  it("shows the card's veil tint before a picture title slide's own picture has decoded", () => {
    box = viewportBox({ width: 160, height: 90 });
    const slideshow: Slideshow = {
      formatVersion: 6,
      title: "T",
      slides: [veiledPictureTitleSlide(), nextSlide()],
    };

    createPlayer(box, slideshow);

    expect(centrePixel()).toEqual(TINT_RGB);
  });

  it("stays plain black for a slideshow with no title card on its opening slide", () => {
    box = viewportBox({ width: 160, height: 90 });
    const slideshow: Slideshow = {
      formatVersion: 6,
      title: "T",
      slides: [nextSlide(), nextSlide()],
    };

    createPlayer(box, slideshow);

    expect(centrePixel()).toEqual([0, 0, 0]);
  });
});
