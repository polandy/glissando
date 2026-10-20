import type { MusicLoudness } from "./measure-loudness";

/** Asks the loudness worker to measure one decoded track; the id pairs it with its reply. */
export interface LoudnessRequest {
  readonly id: number;
  /** Every channel, at the track's own sample rate, transferred to the worker. */
  readonly channels: readonly Float32Array[];
  readonly sampleRate: number;
}

/** The loudness worker's answer to the request with the same id. */
export type LoudnessReply =
  | { readonly id: number; readonly kind: "found"; readonly loudness: MusicLoudness }
  | { readonly id: number; readonly kind: "failed"; readonly message: string };
