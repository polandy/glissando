import type { PictureLoader } from "../ports";
import type { OpenPicture } from "./picture-loader";

/** A picture decoded into a bitmap, drawn by the WebGL renderer. */
export interface BitmapPicture {
  readonly bitmap: ImageBitmap;
  readonly width: number;
  readonly height: number;
}

/** Decodes a picture's bytes, upright by its EXIF orientation; `WorkerPictureDecoder` is one. */
export interface PictureDecoder {
  decode(bytes: Blob): Promise<ImageBitmap>;
  dispose(): void;
}

export class PictureFetchError extends Error {
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
 * picture's bitmap is closed, so a long slideshow holds just the buffered pictures.
 */
export class BitmapLoader implements PictureLoader<BitmapPicture> {
  readonly #decoder: PictureDecoder;
  readonly #open: OpenPicture;

  constructor(decoder: PictureDecoder, openPicture: OpenPicture = fetchPicture) {
    this.#decoder = decoder;
    this.#open = openPicture;
  }

  async load(src: string): Promise<BitmapPicture> {
    const bitmap = await this.#decoder.decode(await this.#open(src));
    return { bitmap, width: bitmap.width, height: bitmap.height };
  }

  release(picture: BitmapPicture): void {
    picture.bitmap.close();
  }

  dispose(): void {
    this.#decoder.dispose();
  }
}
