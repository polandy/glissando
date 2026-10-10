import type { PictureDecoder } from "./bitmap-loader";
import { PictureDecodeError } from "./worker-picture-decoder";

/**
 * Decodes with `primary` until it fails a picture that `fallback` then decodes: from that moment
 * the primary is disposed and every decode, a pending one the primary fails later included, goes
 * to the fallback. A picture both fail rejects with the fallback's error and leaves the primary
 * in use, since that picture is broken rather than the primary.
 */
export class FallbackPictureDecoder implements PictureDecoder {
  readonly #primary: PictureDecoder;
  readonly #fallback: PictureDecoder;
  #primaryFailed = false;

  constructor(primary: PictureDecoder, fallback: PictureDecoder) {
    this.#primary = primary;
    this.#fallback = fallback;
  }

  async decode(bytes: Blob): Promise<ImageBitmap> {
    if (this.#primaryFailed) return this.#fallback.decode(bytes);
    try {
      return await this.#primary.decode(bytes);
    } catch {
      const bitmap = await this.#fallback.decode(bytes);
      this.#switchToFallback();
      return bitmap;
    }
  }

  dispose(): void {
    this.#primary.dispose();
    this.#fallback.dispose();
  }

  #switchToFallback(): void {
    if (this.#primaryFailed) return;
    this.#primaryFailed = true;
    this.#primary.dispose();
  }
}

/** Decodes on the main thread, upright by its EXIF orientation. */
export const mainThreadPictureDecoder: PictureDecoder = {
  async decode(bytes) {
    try {
      return await createImageBitmap(bytes, { imageOrientation: "from-image" });
    } catch (error) {
      throw new PictureDecodeError(error instanceof Error ? error.message : String(error));
    }
  },
  dispose() {
    // It holds nothing.
  },
};
