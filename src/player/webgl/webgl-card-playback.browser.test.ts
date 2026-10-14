import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import type { PictureLoader } from "../ports";
import { SlideshowPlayer } from "../slideshow-player";
import { nextEvent } from "../slideshow-player-fixtures";
import type { GroundSlide, PictureSlide, Slideshow } from "../slideshow";
import { FakeClock, FakeFrameScheduler, FakeMusic } from "../testing/fakes";
import { solidBitmap, viewportBox, RED, type Rgb } from "../testing/browser-pictures";
import { ControlledFonts, VIEWPORT } from "./testing/card-render-fixtures";
import { WebGlRenderer } from "./webgl-renderer";

/** `#101010`. */
const GROUND_HEX = "#101010";
const GROUND_COLOUR: Rgb = [16, 16, 16];
const COLOUR_TOLERANCE = 8;

/** Resolves every picture to the same red bitmap; a title slide on a picture never needs more. */
class OneBitmapLoader implements PictureLoader<BitmapPicture> {
  readonly #bitmap: Promise<BitmapPicture>;
  constructor(bitmap: Promise<BitmapPicture>) {
    this.#bitmap = bitmap;
  }
  load(): Promise<BitmapPicture> {
    return this.#bitmap;
  }
  release(): void {
    // Nothing to release: the one bitmap is reused for every slide.
  }
  dispose(): void {
    // Nothing to dispose.
  }
}

function isColour(actual: Rgb, expected: Rgb): boolean {
  return actual.every(
    (channel, index) => Math.abs(channel - (expected[index] ?? 0)) <= COLOUR_TOLERANCE,
  );
}

function setUp(slides: Slideshow["slides"], { fontsLoaded = true } = {}) {
  const box = viewportBox(VIEWPORT);
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const context = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (context === null) {
    throw new Error("this browser has no WebGL2");
  }
  const gl: WebGL2RenderingContext = context;
  const fonts = new ControlledFonts();
  let resizeListener: () => void = () => undefined;
  const onResize = () => resizeListener();
  const renderer = new WebGlRenderer(canvas, gl, onResize, { pixelRatio: () => 1, fonts });
  if (fontsLoaded) {
    fonts.finishLoading();
  }
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const music = new FakeMusic();
  const slideshow: Slideshow = { formatVersion: 6, title: "Test", slides };
  const player = new SlideshowPlayer(slideshow, {
    renderer,
    pictures: new OneBitmapLoader(solidBitmap(RED)),
    clock,
    frames,
    openMusic: () => music,
  });
  resizeListener = () => player.redraw();
  function readPixel([x, y]: readonly [number, number]): Rgb {
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
  return {
    box,
    player,
    renderer,
    clock,
    frames,
    fonts,
    /** Advances the fake clock and runs the pending animation frame, as real playback would. */
    advance(ms: number) {
      clock.advance(ms);
      frames.runFrame();
    },
    readPixel,
  };
}

function groundTitleSlide(durationMs: number): GroundSlide {
  return {
    ground: GROUND_HEX,
    durationMs,
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

function pictureTitleSlide(durationMs: number): PictureSlide {
  return {
    image: { src: "a.jpg", capturedAt: "2026-06-01T10:00:00Z" },
    durationMs,
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

describe("playing a title slide from the start", () => {
  let box: HTMLElement;
  afterEach(() => box.remove());

  it("shows the ground colour throughout a title slide on a colour, not black", async () => {
    const setup = setUp([groundTitleSlide(4000), nextSlide()]);
    box = setup.box;

    const playing = nextEvent(setup.player, "playing");
    setup.player.play();
    await playing;

    // Right as playback starts: still well inside the title slide's enter phase.
    expect(setup.readPixel([0.9, 0.9])).toSatisfy((pixel: Rgb) => isColour(pixel, GROUND_COLOUR));

    // Midway through the title slide, once its text has fully entered.
    setup.advance(2000);

    expect(setup.readPixel([0.9, 0.9])).toSatisfy((pixel: Rgb) => isColour(pixel, GROUND_COLOUR));
  });

  it("shows the picture throughout a title slide on a picture, with reveal, not black", async () => {
    const setup = setUp([pictureTitleSlide(6000), nextSlide()]);
    box = setup.box;

    const playing = nextEvent(setup.player, "playing");
    setup.player.play();
    await playing;

    // Outside the card's centred text block, the picture (darkened by the veil) must show.
    expect(setup.readPixel([0.95, 0.95])).not.toEqual([0, 0, 0]);

    setup.advance(2000);

    expect(setup.readPixel([0.95, 0.95])).not.toEqual([0, 0, 0]);
  });

  it("shows the picture before its card's font has loaded", async () => {
    const setup = setUp([pictureTitleSlide(6000), nextSlide()], { fontsLoaded: false });
    box = setup.box;

    const playing = nextEvent(setup.player, "playing");
    setup.player.play();
    await playing;
    setup.advance(500);

    expect(setup.readPixel([0.95, 0.95])).not.toEqual([0, 0, 0]);
  });

  it("keeps the ground colour once its card's font finishes loading mid-slide", async () => {
    const setup = setUp([groundTitleSlide(4000), nextSlide()], { fontsLoaded: false });
    box = setup.box;

    const playing = nextEvent(setup.player, "playing");
    setup.player.play();
    await playing;
    setup.advance(500);

    expect(setup.readPixel([0.9, 0.9])).toSatisfy((pixel: Rgb) => isColour(pixel, GROUND_COLOUR));

    setup.fonts.finishLoading();
    await setup.renderer.cardFontLoaded("modern");
    setup.advance(16);

    expect(setup.readPixel([0.9, 0.9])).toSatisfy((pixel: Rgb) => isColour(pixel, GROUND_COLOUR));
  });
});
