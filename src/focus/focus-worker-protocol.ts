import type { PictureFocus } from "../library/picture-focus";

/** Asks the focus worker to look at one thumbnail; the id pairs it with its reply. */
export interface FocusRequest {
  readonly id: number;
  readonly thumbnail: Blob;
}

/** The focus worker's answer to the request with the same id. */
export type FocusReply =
  | { readonly id: number; readonly kind: "found"; readonly focus: PictureFocus }
  | { readonly id: number; readonly kind: "failed"; readonly message: string };
