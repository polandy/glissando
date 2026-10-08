import { afterEach, describe, expect, it } from "vitest";
import type { BrowserPicture } from "../browser/picture-loader";
import type { RenderFrame } from "../ports";
import { TRANSITION_EFFECTS, type Framing } from "../slideshow";
import {
  BLUE,
  GREEN,
  quadrantPicture,
  RED,
  solidPicture,
  viewportBox,
  WHITE,
  type Rgb,
} from "../testing/browser-pictures";
import { WebGlRenderer } from "./webgl-renderer";

const VIEWPORT = { width: 100, height: 100 };
const WHOLE_PICTURE: Framing = { zoom: 1, centerX: 0.5, centerY: 0.5 };
const COLOUR_TOLERANCE = 8;
/** Sample points as fractions of the viewport from the top left, away from soft edges. */
const SAMPLE_GRID = [0.1, 0.3, 0.5, 0.7, 0.9].flatMap((x) =>
  [0.1, 0.3, 0.5, 0.7, 0.9].map((y) => [x, y] as const),
);

let box: HTMLElement;

function setUp(onResize: () => void = () => undefined) {
  box = viewportBox(VIEWPORT);
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (gl === null) {
    throw new Error("this browser has no WebGL2");
  }
  const renderer = new WebGlRenderer(canvas, gl, onResize, { pixelRatio: () => 1 });
  /** Reads straight after drawing, before the browser presents and clears the frame. */
  function drawAndRead(
    frame: RenderFrame<BrowserPicture>,
    xFromLeft: number,
    yFromTop: number,
  ): Rgb {
    renderer.render(frame);
    const pixel = new Uint8Array(4);
    const x = Math.floor(xFromLeft * canvas.width);
    const y = Math.floor((1 - yFromTop) * canvas.height);
    gl?.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
  }
  return { renderer, drawAndRead, canvas, gl };
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

function isColour(actual: Rgb, expected: Rgb): boolean {
  return actual.every(
    (channel, index) => Math.abs(channel - (expected[index] ?? 0)) <= COLOUR_TOLERANCE,
  );
}

afterEach(() => box.remove());

describe("WebGlRenderer", () => {
  it("draws the whole picture upright at zoom 1", async () => {
    const { drawAndRead } = setUp();
    const picture = await quadrantPicture();
    const frame: RenderFrame<BrowserPicture> = {
      kind: "slide",
      slide: { picture, framing: WHOLE_PICTURE },
    };

    expect(drawAndRead(frame, 0.2, 0.2)).toEqual(RED);
    expect(drawAndRead(frame, 0.8, 0.2)).toEqual(GREEN);
    expect(drawAndRead(frame, 0.2, 0.8)).toEqual(BLUE);
    expect(drawAndRead(frame, 0.8, 0.8)).toEqual(WHITE);
  });

  it("shows only the Ken Burns crop: zoom 2 on the top-left quadrant fills the screen red", async () => {
    const { drawAndRead } = setUp();
    const picture = await quadrantPicture();
    const framing = { zoom: 2, centerX: 0.25, centerY: 0.25 };
    const frame: RenderFrame<BrowserPicture> = { kind: "slide", slide: { picture, framing } };

    for (const [x, y] of SAMPLE_GRID) {
      expect(drawAndRead(frame, x, y)).toEqual(RED);
    }
  });

  describe.each(TRANSITION_EFFECTS)("the %s transition", (effect) => {
    async function transitionAt(progress: number): Promise<RenderFrame<BrowserPicture>> {
      return {
        kind: "transition",
        effect,
        progress,
        from: { picture: await solidPicture(RED), framing: WHOLE_PICTURE },
        to: { picture: await solidPicture(BLUE), framing: WHOLE_PICTURE },
      };
    }

    it("shows only the outgoing picture at its start", async () => {
      const { drawAndRead } = setUp();
      const frame = await transitionAt(0);

      for (const [x, y] of SAMPLE_GRID) {
        expect(drawAndRead(frame, x, y)).toEqual(RED);
      }
    });

    it("shows only the incoming picture at its end", async () => {
      const { drawAndRead } = setUp();
      const frame = await transitionAt(1);

      for (const [x, y] of SAMPLE_GRID) {
        expect(drawAndRead(frame, x, y)).toEqual(BLUE);
      }
    });

    it("shows something of the incoming picture halfway, not only the outgoing one", async () => {
      const { drawAndRead } = setUp();
      const frame = await transitionAt(0.5);

      const samples = SAMPLE_GRID.map(([x, y]) => drawAndRead(frame, x, y));

      expect(samples.some((sample) => sample[2] > COLOUR_TOLERANCE)).toBe(true);
      expect(samples.some((sample) => !isColour(sample, BLUE))).toBe(true);
    });
  });

  describe("losing and restoring the WebGL context", () => {
    function loseContextExtension(gl: WebGL2RenderingContext): WEBGL_lose_context {
      const extension = gl.getExtension("WEBGL_lose_context");
      if (extension === null) {
        throw new Error("this browser has no WEBGL_lose_context");
      }
      return extension;
    }

    it("does nothing and never throws from render() while the context is lost", async () => {
      const { renderer, drawAndRead, canvas, gl } = setUp();
      const lose = loseContextExtension(gl);
      const picture = await solidPicture(RED);
      const frame: RenderFrame<BrowserPicture> = {
        kind: "slide",
        slide: { picture, framing: WHOLE_PICTURE },
      };
      drawAndRead(frame, 0.5, 0.5);

      const lost = waitFor(canvas, "webglcontextlost");
      lose.loseContext();
      await lost;

      expect(() => renderer.render(frame)).not.toThrow();
      expect(() => renderer.forget(picture)).not.toThrow();
    });

    it("rebuilds its GL resources and redraws the current frame once the context is restored", async () => {
      let resolveResize: (() => void) | undefined;
      const resized = new Promise<void>((resolve) => (resolveResize = resolve));
      const { drawAndRead, canvas, gl } = setUp(() => resolveResize?.());
      const lose = loseContextExtension(gl);
      const picture = await solidPicture(RED);
      const frame: RenderFrame<BrowserPicture> = {
        kind: "slide",
        slide: { picture, framing: WHOLE_PICTURE },
      };
      drawAndRead(frame, 0.5, 0.5);

      const lost = waitFor(canvas, "webglcontextlost");
      lose.loseContext();
      await lost;
      // The browser allows a restore only once the task dispatching the lost event has ended;
      // the listener above resumes us inside that task.
      await afterCurrentTask();
      const restored = waitFor(canvas, "webglcontextrestored");
      lose.restoreContext();
      await restored;
      await resized;

      for (const [x, y] of SAMPLE_GRID) {
        expect(drawAndRead(frame, x, y)).toEqual(RED);
      }
    });

    it("leaves dispose() safe to call while the context is lost", async () => {
      const { renderer, drawAndRead, canvas, gl } = setUp();
      const lose = loseContextExtension(gl);
      const picture = await solidPicture(RED);
      const frame: RenderFrame<BrowserPicture> = {
        kind: "slide",
        slide: { picture, framing: WHOLE_PICTURE },
      };
      drawAndRead(frame, 0.5, 0.5);

      const lost = waitFor(canvas, "webglcontextlost");
      lose.loseContext();
      await lost;

      expect(() => renderer.dispose()).not.toThrow();
    });
  });
});
