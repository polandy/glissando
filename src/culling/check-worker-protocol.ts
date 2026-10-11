import type { PictureMeasure } from "./picture-checker";

/** Asks the check worker to measure one thumbnail; the id pairs it with its reply. */
export interface CheckRequest {
  readonly id: number;
  readonly thumbnail: Blob;
}

/** The check worker's answer to the request with the same id. */
export type CheckReply =
  | { readonly id: number; readonly kind: "measured"; readonly measure: PictureMeasure }
  | { readonly id: number; readonly kind: "failed"; readonly message: string };
