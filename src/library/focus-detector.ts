import type { PictureFocus } from "./picture-focus";

/** Finds where a picture's people sit, from its stored thumbnail (see ADR-0012). */
export interface FocusDetector {
  /**
   * Rejects when the thumbnail cannot be decoded, with `FocusDetectorGoneError` once the detector
   * can search no picture any more.
   */
  detect(thumbnail: Blob): Promise<PictureFocus>;
}

/** The detector itself is gone (its worker crashed): every later detection would fail too. */
export class FocusDetectorGoneError extends Error {
  override readonly name = "FocusDetectorGoneError";
}
