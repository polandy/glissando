import { BitmapLoader, type BitmapPicture, type PictureDecoder } from "./browser/bitmap-loader";
import type { MusicOutput } from "./browser/music-output";
import {
  ImageElementLoader,
  type BrowserPicture,
  type OpenPicture,
} from "./browser/picture-loader";
import { AudioElementMusic, animationFrames, performanceClock } from "./browser/platform";
import {
  FallbackPictureDecoder,
  mainThreadPictureDecoder,
} from "./browser/fallback-picture-decoder";
import { WorkerPictureDecoder, type PictureDecodeWorker } from "./browser/worker-picture-decoder";
import { DomRenderer } from "./dom/dom-renderer";
import type { PictureLoader, SlideRenderer } from "./ports";
import type { Slideshow } from "./slideshow";
import { SlideshowPlayer } from "./slideshow-player";
import { WebGlRenderer } from "./webgl/webgl-renderer";

type WebGl2Context = (canvas: HTMLCanvasElement) => WebGL2RenderingContext | null;

const defaultWebGl2Context: WebGl2Context = (canvas) =>
  canvas.getContext("webgl2", { alpha: false, antialias: false });

export interface BrowserPlayerOptions {
  /** Starts the worker that decodes pictures for WebGL2 (ADR-0014). */
  readonly startDecodeWorker: () => PictureDecodeWorker;
  /**
   * Decodes on the main thread once the worker fails a picture the main thread can decode, or
   * cannot run at all: WebKit's worker reads no Blob in a page opened from `file://`.
   */
  readonly mainThreadDecodeFallback?: boolean;
  /** The WebGL2 context for the player's canvas; null selects the DOM fallback. */
  readonly webGl2Context?: WebGl2Context;
  /**
   * Reads a slide's picture by its `image.src`, which then needs to be no URL; without it, `src`
   * is loaded as a URL.
   */
  readonly openPicture?: OpenPicture;
  /** Where the music sounds; without it, at the audio element's own volume. */
  readonly musicOutput?: MusicOutput;
}

const browserObjectUrls = {
  create: (blob: Blob) => URL.createObjectURL(blob),
  revoke: (url: string) => URL.revokeObjectURL(url),
};

/** A renderer with the loader whose pictures it draws. */
type Drawing =
  | {
      readonly kind: "webgl";
      readonly renderer: SlideRenderer<BitmapPicture>;
      readonly pictures: PictureLoader<BitmapPicture>;
    }
  | {
      readonly kind: "dom";
      readonly renderer: SlideRenderer<BrowserPicture>;
      readonly pictures: PictureLoader<BrowserPicture>;
    };

/** A player drawing with WebGL2 or with the DOM fallback; they differ only inside. */
export type BrowserPlayer = SlideshowPlayer<BitmapPicture> | SlideshowPlayer<BrowserPicture>;

/**
 * `createPlayer` with the decode worker started by the caller: the exported page starts it from
 * a script inside itself.
 */
export function createBrowserPlayer(
  container: HTMLElement,
  slideshow: Slideshow,
  {
    startDecodeWorker,
    mainThreadDecodeFallback = false,
    webGl2Context = defaultWebGl2Context,
    openPicture,
    musicOutput,
  }: BrowserPlayerOptions,
): BrowserPlayer {
  let player: BrowserPlayer | null = null;
  const redraw = () => player?.redraw();
  const createDecoder = (): PictureDecoder => {
    const workerDecoder = new WorkerPictureDecoder(startDecodeWorker);
    return mainThreadDecodeFallback
      ? new FallbackPictureDecoder(workerDecoder, mainThreadPictureDecoder)
      : workerDecoder;
  };
  const drawing = createDrawing(container, redraw, webGl2Context, openPicture, createDecoder);
  const playback = {
    clock: performanceClock,
    frames: animationFrames,
    ...(slideshow.music ? { music: new AudioElementMusic(slideshow.music.src, musicOutput) } : {}),
  };
  player =
    drawing.kind === "webgl"
      ? new SlideshowPlayer(slideshow, {
          renderer: drawing.renderer,
          pictures: drawing.pictures,
          ...playback,
        })
      : new SlideshowPlayer(slideshow, {
          renderer: drawing.renderer,
          pictures: drawing.pictures,
          ...playback,
        });
  return player;
}

function createDrawing(
  container: HTMLElement,
  onResize: () => void,
  webGl2Context: WebGl2Context,
  openPicture: OpenPicture | undefined,
  createDecoder: () => PictureDecoder,
): Drawing {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
  const gl = webGl2Context(canvas);
  if (gl === null) {
    return {
      kind: "dom",
      renderer: new DomRenderer(container, onResize),
      pictures: new ImageElementLoader(
        openPicture === undefined ? null : { openPicture, urls: browserObjectUrls },
      ),
    };
  }
  container.append(canvas);
  return {
    kind: "webgl",
    renderer: new WebGlRenderer(canvas, gl, onResize),
    pictures: new BitmapLoader(createDecoder(), openPicture),
  };
}
