import { startPictureDecodeWorker } from "./browser/start-picture-decode-worker";
import {
  createBrowserPlayer,
  type BrowserPlayer,
  type BrowserPlayerOptions,
} from "./browser-player";
import type { Slideshow } from "./slideshow";

export type CreatePlayerOptions = Omit<BrowserPlayerOptions, "startDecodeWorker">;

/**
 * Plays `slideshow` inside `container`, which it fills: with WebGL2 where the browser has it,
 * its pictures decoded in a worker, otherwise with the DOM fallback.
 */
export function createPlayer(
  container: HTMLElement,
  slideshow: Slideshow,
  options: CreatePlayerOptions = {},
): BrowserPlayer {
  return createBrowserPlayer(container, slideshow, {
    ...options,
    startDecodeWorker: startPictureDecodeWorker,
  });
}
