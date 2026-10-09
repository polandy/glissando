import type { PictureFocus } from "./picture-focus";

/** Finds where a picture's people sit, from its stored thumbnail (see ADR-0012). */
export interface FocusDetector {
  /** Rejects when the thumbnail cannot be decoded. */
  detect(thumbnail: Blob): Promise<PictureFocus>;
}
