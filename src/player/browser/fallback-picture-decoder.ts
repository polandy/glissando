import type { PictureDecoder } from "./bitmap-loader";
import { PictureDecodeError } from "./worker-picture-decoder";

/**
 * Decodes with `primary` until it fails a picture that `fallback` then decodes: from that moment
 * the primary is disposed and every decode, a pending one the primary fails later included, goes
 * to the fallback. A picture both fail rejects with an `AggregateError` of both errors and leaves
 * the primary in use, since that picture is broken rather than the primary. Once disposed, nothing
 * more is decoded: a pending decode rejects, and a bitmap that arrives anyway is closed.
 */
export class FallbackPictureDecoder implements PictureDecoder {
  readonly #primary: PictureDecoder;
  readonly #fallback: PictureDecoder;
  #primaryFailed = false;
  #disposed = false;

  constructor(primary: PictureDecoder, fallback: PictureDecoder) {
    this.#primary = primary;
    this.#fallback = fallback;
  }

  async decode(bytes: Blob): Promise<ImageBitmap> {
    if (this.#disposed) throw disposedError();
    if (this.#primaryFailed) return this.#keptIfLive(await this.#fallback.decode(bytes));
    let primaryError: unknown;
    try {
      return await this.#primary.decode(bytes);
    } catch (error: unknown) {
      primaryError = error;
    }
    // Disposal rejects the primary's pending decodes; they are not the primary's failures.
    if (this.#disposed) throw primaryError;
    let bitmap: ImageBitmap;
    try {
      bitmap = await this.#fallback.decode(bytes);
    } catch (fallbackError: unknown) {
      throw new AggregateError(
        [primaryError, fallbackError],
        "neither picture decoder could decode the picture",
        { cause: fallbackError },
      );
    }
    this.#switchToFallback();
    return this.#keptIfLive(bitmap);
  }

  dispose(): void {
    this.#disposed = true;
    this.#primary.dispose();
    this.#fallback.dispose();
  }

  #keptIfLive(bitmap: ImageBitmap): ImageBitmap {
    if (!this.#disposed) return bitmap;
    bitmap.close();
    throw disposedError();
  }

  #switchToFallback(): void {
    if (this.#primaryFailed) return;
    this.#primaryFailed = true;
    this.#primary.dispose();
  }
}

function disposedError(): PictureDecodeError {
  return new PictureDecodeError("The picture decoder was disposed");
}

/** Decodes on the main thread, upright by its EXIF orientation. */
export const mainThreadPictureDecoder: PictureDecoder = {
  async decode(bytes) {
    try {
      return await createImageBitmap(bytes, { imageOrientation: "from-image" });
    } catch (error) {
      throw new PictureDecodeError(error instanceof Error ? error.message : String(error), {
        cause: error,
      });
    }
  },
  dispose() {
    // It holds nothing.
  },
};
