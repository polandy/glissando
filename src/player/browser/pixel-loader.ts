import type { RgbaPixels } from "../backdrop-blur";
import type { PictureLoader } from "../ports";
import type { OpenPicture } from "./picture-loader";

/**
 * A picture decoded into its RGBA bytes, drawn by the WebGL renderer: a slice of rows uploads
 * from its own bytes, where a bitmap is read whole for every slice (ADR-0014).
 */
export type PixelPicture = RgbaPixels;

/** Decodes a picture's bytes, upright by its EXIF orientation; `WorkerPictureDecoder` is one. */
export interface PictureDecoder {
  decode(bytes: Blob): Promise<PixelPicture>;
  dispose(): void;
}

class PictureFetchError extends Error {
  constructor(src: string, status: number) {
    super(`the picture ${src} did not load: HTTP ${status}`);
    this.name = "PictureFetchError";
  }
}

async function fetchPicture(src: string): Promise<Blob> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new PictureFetchError(src, response.status);
  }
  return response.blob();
}

/**
 * Reads each picture's bytes when it is loaded, from `openPicture` or else by fetching `src`,
 * and decodes them with `decoder`, off the main thread in production (see ADR-0014). A released
 * picture's bytes are left to the garbage collector, so a long slideshow holds just the buffered
 * pictures.
 */
export class PixelLoader implements PictureLoader<PixelPicture> {
  readonly #decoder: PictureDecoder;
  readonly #open: OpenPicture;

  constructor(decoder: PictureDecoder, openPicture: OpenPicture = fetchPicture) {
    this.#decoder = decoder;
    this.#open = openPicture;
  }

  async load(src: string): Promise<PixelPicture> {
    return this.#decoder.decode(await this.#open(src));
  }

  release(): void {
    // The picture holds only bytes, which nothing references once the buffer drops it.
  }

  dispose(): void {
    this.#decoder.dispose();
  }
}
