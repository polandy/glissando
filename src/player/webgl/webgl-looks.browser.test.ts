import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { Fonts } from "../fonts";
import { gradeColour, type Rgb as GradeRgb } from "../looks/grade-colour";
import { GRADED_SLIDESHOW_LOOKS, type SlideshowLook } from "../looks/slideshow-look";
import type { RenderFrame, SlideLayer } from "../ports";
import {
  BLUE,
  solidBitmap,
  standingStill,
  viewportBox,
  type Rgb,
} from "../testing/browser-pictures";
import {
  baseCard,
  cardVisual,
  groundLayer,
  GROUND_COLOUR,
  isColour,
  setUpCardRenderer,
} from "./testing/card-render-fixtures";
import { WebGlRenderer } from "./webgl-renderer";

const VIEWPORT = { width: 100, height: 100 };
const WHOLE_PICTURE = { zoom: 1, centerX: 0.5, centerY: 0.5 } as const;
const CAPTION = "HH";
/** A channel's 0..1 scale (`gradeColour`) to its 8-bit pixel scale (the read-back). */
const EIGHT_BIT_MAX = 255;
/** Off the primaries, so a look's matrix cross-terms and offset show up too, not only its diagonal. */
const GRADED_COLOUR: Rgb = [180, 90, 40];
/** A text glyph's red channel, fully opaque: well above any graded background's red. */
const WHITE_TEXT_RED = 200;

let box: HTMLElement;

/** Fonts the test lets load straight away (`webgl-captions.browser.test.ts`'s pattern). */
class ControlledFonts implements Fonts {
  #resolve: () => void = () => undefined;
  readonly #loaded = new Promise<void>((resolve) => (this.#resolve = resolve));
  load(): Promise<unknown> {
    return this.#loaded;
  }
  finishLoading(): void {
    this.#resolve();
  }
}

async function setUp() {
  box = viewportBox(VIEWPORT);
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const context = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (context === null) {
    throw new Error("this browser has no WebGL2");
  }
  // A non-null-typed alias: TypeScript does not carry the null check above into the nested
  // functions below, which close over this variable rather than being called immediately.
  const gl: WebGL2RenderingContext = context;
  const fonts = new ControlledFonts();
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, { pixelRatio: () => 1, fonts });
  fonts.finishLoading();
  await renderer.captionFontLoaded;
  /** Reads straight after drawing, before the browser presents and clears the frame. */
  function drawAndRead(frame: RenderFrame<BitmapPicture>, [x, y]: readonly [number, number]): Rgb {
    renderer.render(frame);
    const pixel = new Uint8Array(4);
    gl.readPixels(
      Math.floor(x * canvas.width),
      Math.floor((1 - y) * canvas.height),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel,
    );
    return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
  }
  /** Every pixel's red channel in the bottom half, where the caption's text sits. */
  function bottomHalfReds(frame: RenderFrame<BitmapPicture>): number[] {
    renderer.render(frame);
    const half = canvas.height / 2;
    const pixels = new Uint8Array(canvas.width * half * 4);
    gl.readPixels(0, 0, canvas.width, half, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return [...pixels].filter((_, index) => index % 4 === 0);
  }
  return { drawAndRead, bottomHalfReds };
}

async function layer(colour: Rgb, caption?: string): Promise<SlideLayer<BitmapPicture>> {
  const picture = await solidBitmap(colour);
  return caption === undefined
    ? { kind: "picture", picture, motion: standingStill(WHOLE_PICTURE) }
    : { kind: "picture", picture, motion: standingStill(WHOLE_PICTURE), caption };
}

async function slideFrame(
  colour: Rgb,
  look: SlideshowLook,
  caption?: string,
): Promise<RenderFrame<BitmapPicture>> {
  return { kind: "slide", slide: await layer(colour, caption), endFade: 0, look };
}

/** `gradeColour`'s result for `colour`, on the pixel read-back's 8-bit scale. */
function gradedPixel(look: SlideshowLook, [r, g, b]: Rgb): Rgb {
  const unit: GradeRgb = [r / EIGHT_BIT_MAX, g / EIGHT_BIT_MAX, b / EIGHT_BIT_MAX];
  const [gr, gg, gb] = gradeColour(look, unit);
  return [
    Math.round(gr * EIGHT_BIT_MAX),
    Math.round(gg * EIGHT_BIT_MAX),
    Math.round(gb * EIGHT_BIT_MAX),
  ];
}

afterEach(() => box.remove());

describe("WebGlRenderer looks (ADR-0044)", () => {
  it.each(GRADED_SLIDESHOW_LOOKS)(
    "grades a picture's colour by '%s', as gradeColour does",
    async (look) => {
      const { drawAndRead } = await setUp();
      const frame = await slideFrame(GRADED_COLOUR, look);

      expect(drawAndRead(frame, [0.5, 0.5])).toSatisfy((pixel: Rgb) =>
        isColour(pixel, gradedPixel(look, GRADED_COLOUR)),
      );
    },
  );

  it("leaves a picture's colour be for 'none'", async () => {
    const { drawAndRead } = await setUp();
    const frame = await slideFrame(GRADED_COLOUR, "none");

    expect(drawAndRead(frame, [0.5, 0.5])).toEqual(GRADED_COLOUR);
  });

  it.each(GRADED_SLIDESHOW_LOOKS)(
    "never grades a ground card's colour, under '%s'",
    async (look) => {
      const support = setUpCardRenderer();
      box = support.box;
      const frame: RenderFrame<BitmapPicture> = {
        kind: "slide",
        slide: groundLayer(cardVisual(baseCard())),
        endFade: 0,
        look,
      };

      expect(support.readPixel(frame, [0.02, 0.02])).toSatisfy((pixel: Rgb) =>
        isColour(pixel, GROUND_COLOUR),
      );
    },
  );

  it.each(GRADED_SLIDESHOW_LOOKS)(
    "leaves the caption's text in white, under '%s'",
    async (look) => {
      const { bottomHalfReds } = await setUp();

      const reds = bottomHalfReds(await slideFrame(BLUE, look, CAPTION));

      expect(reds.some((red) => red > WHITE_TEXT_RED)).toBe(true);
    },
  );
});
