import type { MusicBeats } from "./music-beats";

/** Asks the beat worker to find the beats in one decoded track; the id pairs it with its reply. */
export interface BeatRequest {
  readonly id: number;
  /** Mono samples, transferred to the worker. */
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

/** The beat worker's answer to the request with the same id. */
export type BeatReply =
  | { readonly id: number; readonly kind: "found"; readonly beats: MusicBeats }
  | { readonly id: number; readonly kind: "failed"; readonly message: string };
