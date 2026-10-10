import { BitmapLoader, type BitmapPicture } from "./browser/bitmap-loader";
import type { OpenPicture } from "./browser/picture-loader";
import { animationFrames, performanceClock } from "./browser/platform";
import { startPictureDecodeWorker, WorkerPictureDecoder } from "./browser/worker-picture-decoder";
import type { Size } from "./ken-burns";
import type { Slideshow } from "./slideshow";
import { SlideshowPlayer } from "./slideshow-player";
import { WebGlRenderer } from "./webgl/webgl-renderer";

/** A player that draws frames on demand (`renderAt`) into a canvas of its own. */
export interface FramePlayer {
  readonly player: SlideshowPlayer<BitmapPicture>;
  /** In no document, `size` large; holds the last frame drawn. */
  readonly canvas: HTMLCanvasElement;
  /** Settles once captions can be drawn; wait for it before the first frame. */
  readonly captionFontLoaded: Promise<void>;
  /** Destroys the player and gives the WebGL context back: a page holds only a few at once. */
  dispose(): void;
}

/**
 * For the video export: draws `slideshow` with WebGL2 at exactly `size` pixels and no music.
 * Null where the browser has no WebGL2.
 */
export function createFramePlayer(
  slideshow: Slideshow,
  size: Size,
  openPicture?: OpenPicture,
): FramePlayer | null {
  const canvas = document.createElement("canvas");
  // The drawing buffer is read into a video frame after drawing, never shown.
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (gl === null) {
    return null;
  }
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, {
    pixelRatio: () => 1,
    drawingSize: size,
  });
  const decoder = new WorkerPictureDecoder(startPictureDecodeWorker);
  const pictures = new BitmapLoader(decoder, openPicture);
  // Without a music playback the player stays silent; the export renders the music itself.
  const player = new SlideshowPlayer(slideshow, {
    renderer,
    pictures,
    clock: performanceClock,
    frames: animationFrames,
  });
  return {
    player,
    canvas,
    captionFontLoaded: renderer.captionFontLoaded,
    dispose: () => {
      player.destroy();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
