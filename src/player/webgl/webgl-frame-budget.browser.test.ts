import { afterEach, describe, expect, it } from "vitest";
import type { PixelPicture } from "../browser/pixel-loader";
import type { RenderFrame } from "../ports";
import { TRANSITION_EFFECTS } from "../slideshow";
import { BLUE, RED, solidPixels, standingStill, viewportBox } from "../testing/browser-pictures";
import { baseCard, cardVisual, groundLayer } from "./testing/card-render-fixtures";
import { countingGl } from "./testing/counting-gl";
import { CARD_LAYER_BUDGET, FRAME_WORK_BUDGET } from "./testing/frame-work-budget";
import { WebGlRenderer } from "./webgl-renderer";

const STILL = standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 });
const FRAMES_DRAWN = 3;
const MIDWAY = 0.5;
/** A frame composes a `from` and a `to` layer; a single slide is both. */
const LAYERS_PER_FRAME = 2;

let box: HTMLElement;
afterEach(() => box.remove());

/** A renderer on a counting context, whose pictures are fully prepared before it counts. */
function setUp() {
  box = viewportBox({ width: 160, height: 90 });
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const context = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (context === null) {
    throw new Error("this browser has no WebGL2");
  }
  const counter = countingGl(context);
  const renderer = new WebGlRenderer(canvas, counter.gl, () => undefined, { pixelRatio: () => 1 });
  return { renderer, counter };
}

const red = solidPixels(RED);
const blue = solidPixels(BLUE);

function prepared(renderer: WebGlRenderer, pictures: readonly PixelPicture[]): void {
  for (const picture of pictures) {
    // Upload, mipmaps and backdrop are a few steps; this many leaves nothing for a draw.
    for (let step = 0; step < 8; step += 1) {
      renderer.prepare({ picture });
    }
  }
}

function drawn(renderer: WebGlRenderer, frame: RenderFrame<PixelPicture>): void {
  for (let drawing = 0; drawing < FRAMES_DRAWN; drawing += 1) {
    renderer.render(frame);
  }
}

/** The calls of one frame: what `FRAMES_DRAWN` identical frames cost, divided by their number. */
function perFrame(calls: Readonly<Record<string, number>>, method: string): number {
  return (calls[method] ?? 0) / FRAMES_DRAWN;
}

function expectWithinBudget(
  calls: Readonly<Record<string, number>>,
  budget: Readonly<Record<string, number>>,
): void {
  for (const [method, allowed] of Object.entries(budget)) {
    expect(perFrame(calls, method), method).toBeLessThanOrEqual(allowed);
  }
}

describe("WebGlRenderer: the work one prepared frame may do", () => {
  it("draws a still picture within the budget, as the only work it did", () => {
    const { renderer, counter } = setUp();
    prepared(renderer, [red]);
    counter.reset();

    drawn(renderer, {
      kind: "slide",
      slide: { kind: "picture", picture: red, motion: STILL },
      endFade: 0,
      look: "none",
    });

    expect(perFrame(counter.calls(), "drawArrays")).toBe(FRAME_WORK_BUDGET.drawArrays);
    expectWithinBudget(counter.calls(), FRAME_WORK_BUDGET);
  });

  for (const effect of TRANSITION_EFFECTS) {
    it(`draws a ${effect} frame between two prepared pictures within the budget`, () => {
      const { renderer, counter } = setUp();
      prepared(renderer, [red, blue]);
      counter.reset();

      drawn(renderer, {
        kind: "transition",
        effect,
        progress: MIDWAY,
        from: { kind: "picture", picture: red, motion: STILL },
        to: { kind: "picture", picture: blue, motion: STILL },
        endFade: 0,
        look: "none",
      });

      expect(perFrame(counter.calls(), "drawArrays")).toBe(FRAME_WORK_BUDGET.drawArrays);
      expectWithinBudget(counter.calls(), FRAME_WORK_BUDGET);
    });
  }

  it("draws a visible card with its own framebuffer pass and nothing more", () => {
    const { renderer, counter } = setUp();
    const card = baseCard();
    renderer.prepare({ ground: "#101010", card });
    renderer.prepare({ ground: "#101010", card });
    const frame: RenderFrame<PixelPicture> = {
      kind: "slide",
      slide: groundLayer(cardVisual(card, { textOpacity: 1, slideTimeMs: 5000 })),
      endFade: 0,
      look: "none",
    };
    renderer.render(frame);
    counter.reset();

    drawn(renderer, frame);

    expectWithinBudget(counter.calls(), {
      ...FRAME_WORK_BUDGET,
      bindFramebuffer: CARD_LAYER_BUDGET.bindFramebuffer * LAYERS_PER_FRAME,
      drawArrays: FRAME_WORK_BUDGET.drawArrays + CARD_LAYER_BUDGET.drawArrays * LAYERS_PER_FRAME,
      useProgram: Infinity,
    });
  });
});
