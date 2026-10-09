import type { PictureFocus } from "../library/picture-focus";
import type { DecodedPicture } from "./downscale";

/** A picture read from its source: downscaled, dated, and the focus the source already knows. */
export interface ReadPicture {
  readonly decoded: DecodedPicture;
  readonly capturedAt: string;
  /** Null when the source knows none; the on-device pass looks for it later (ADR-0012). */
  readonly focus: PictureFocus | null;
}

/**
 * Where the picture import takes a picture from: a local file or a photo on Immich.
 * `read()` rejects with `UnreadablePictureError` for a picture the browser cannot read or decode,
 * and with `PictureNotDownloadedError` for one whose bytes could not be fetched.
 */
export interface PictureSource {
  readonly fileName: string;
  readonly mimeType: string;
  read(): Promise<ReadPicture>;
}

/** A picture whose bytes could not be fetched from its source; the import skips it. */
export class PictureNotDownloadedError extends Error {
  constructor(
    readonly fileName: string,
    options?: ErrorOptions,
  ) {
    super(`the picture "${fileName}" could not be downloaded`, options);
    this.name = "PictureNotDownloadedError";
  }
}
