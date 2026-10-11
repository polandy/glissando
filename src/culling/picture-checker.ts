/** What the check measures on a picture's thumbnail, for `cull`. */
export interface PictureMeasure {
  readonly sharpness: number;
  /** 64-bit difference hash. */
  readonly hash: bigint;
}

/** Measures stored thumbnails for culling (see ADR-0024). */
export interface PictureChecker {
  /**
   * Rejects when the thumbnail cannot be decoded, with `PictureCheckerGoneError` once the checker
   * can measure no picture any more.
   */
  measure(thumbnail: Blob): Promise<PictureMeasure>;
}

/** The checker itself is gone (its worker crashed): every later measurement would fail too. */
export class PictureCheckerGoneError extends Error {
  override readonly name = "PictureCheckerGoneError";
}

/** A thumbnail the checker could not measure, such as one it cannot decode. */
export class PictureCheckError extends Error {
  override readonly name = "PictureCheckError";
}
