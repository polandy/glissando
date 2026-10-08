import { AudioElementMusic, animationFrames, performanceClock } from "./browser/platform";
import { ImageElementLoader, type BrowserPicture } from "./browser/picture-loader";
import { DomRenderer } from "./dom/dom-renderer";
import type { SlideRenderer } from "./ports";
import type { Slideshow } from "./slideshow";
import { SlideshowPlayer } from "./slideshow-player";
import { WebGlRenderer } from "./webgl/webgl-renderer";

type WebGl2Context = (canvas: HTMLCanvasElement) => WebGL2RenderingContext | null;

const defaultWebGl2Context: WebGl2Context = (canvas) =>
  canvas.getContext("webgl2", { alpha: false, antialias: false });

/**
 * Plays `slideshow` inside `container`, which it fills: with WebGL2 where the browser has it,
 * otherwise with the DOM fallback.
 */
export function createPlayer(
  container: HTMLElement,
  slideshow: Slideshow,
  webGl2Context: WebGl2Context = defaultWebGl2Context,
): SlideshowPlayer<BrowserPicture> {
  let player: SlideshowPlayer<BrowserPicture> | null = null;
  const redraw = () => player?.redraw();
  const renderer = createRenderer(container, redraw, webGl2Context);
  player = new SlideshowPlayer(slideshow, {
    renderer,
    pictures: new ImageElementLoader(),
    clock: performanceClock,
    frames: animationFrames,
    ...(slideshow.music ? { music: new AudioElementMusic(slideshow.music.src) } : {}),
  });
  return player;
}

function createRenderer(
  container: HTMLElement,
  onResize: () => void,
  webGl2Context: WebGl2Context,
): SlideRenderer<BrowserPicture> {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
  const gl = webGl2Context(canvas);
  if (gl === null) {
    return new DomRenderer(container, onResize);
  }
  container.append(canvas);
  return new WebGlRenderer(canvas, gl, onResize);
}
