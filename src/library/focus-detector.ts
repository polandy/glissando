import type { PictureFocus } from "./picture-focus";

/** Finds where a picture's people sit, from its stored thumbnail (see ADR-0012). */
export interface FocusDetector {
  /**
   * Given `display`, the picture as shown, the focus also carries its sharpness on screen
   * (ADR-0061). Rejects when a picture cannot be decoded, with `FocusDetectorGoneError` once the
   * detector can search no picture any more.
   */
  detect(thumbnail: Blob, display?: Blob): Promise<PictureFocus>;
}

/**
 * The detector itself is gone (its worker crashed, or cannot detect in any picture): every later
 * detection would fail too.
 */
export class FocusDetectorGoneError extends Error {
  override readonly name = "FocusDetectorGoneError";
}
