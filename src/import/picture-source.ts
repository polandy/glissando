import type { PictureFocus } from "../library/picture-focus";
import type { PictureIdentity } from "../library/picture-identity";
import type { DecodedPicture } from "./downscale";

/** A picture read from its source: downscaled, with the focus the source already knows. */
export interface ReadPicture {
  readonly decoded: DecodedPicture;
  /** Null when the source knows none; the on-device pass looks for it later (ADR-0012). */
  readonly focus: PictureFocus | null;
}

/**
 * Where the picture import takes a picture from: a local file or a photo on Immich.
 * `identify()` is cheap, so a duplicate is known before the picture is read (ADR-0016). Both
 * reject with `UnreadablePictureError` for a picture the browser cannot read or decode,
 * and with `PictureNotDownloadedError` for one whose bytes could not be fetched.
 */
export interface PictureSource {
  readonly fileName: string;
  readonly mimeType: string;
  identify(): Promise<PictureIdentity>;
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
