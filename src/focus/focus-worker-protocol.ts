import type { PictureFocus } from "../library/picture-focus";

/**
 * Asks the focus worker to look at one thumbnail, to measure a focus found elsewhere on the
 * picture as shown, or to say which runner it chose; the id pairs it with its reply.
 */
export type FocusRequest =
  | {
      readonly id: number;
      readonly kind: "detect";
      readonly thumbnail: Blob;
      /** The picture as shown: present, the reply's focus carries its sharpness on screen (ADR-0061). */
      readonly display?: Blob;
    }
  | {
      readonly id: number;
      readonly kind: "measure";
      readonly display: Blob;
      /** Answered back with its sharpness on screen (ADR-0061). */
      readonly focus: PictureFocus;
    }
  | { readonly id: number; readonly kind: "runner" };

/** What runs the object network in the worker (ADR-0060). */
export type FocusRunnerKind = "wasm" | "js";

/**
 * The focus worker's answer to the request with the same id: `failed` for this thumbnail alone,
 * `unavailable` when the worker can detect in none (its face cascade did not load).
 */
export type FocusReply =
  | { readonly id: number; readonly kind: "found"; readonly focus: PictureFocus }
  | { readonly id: number; readonly kind: "runner"; readonly runner: FocusRunnerKind }
  | { readonly id: number; readonly kind: "failed"; readonly message: string }
  | { readonly id: number; readonly kind: "unavailable"; readonly message: string };
