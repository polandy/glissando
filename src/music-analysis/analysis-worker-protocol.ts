import type { MusicAnalysis } from "../library/music-analyser";

/** Asks the analysis worker to analyse one decoded track; the id pairs it with its reply. */
export interface AnalysisRequest {
  readonly id: number;
  /** Every channel, at the track's own sample rate, transferred to the worker. */
  readonly channels: readonly Float32Array[];
  readonly sampleRate: number;
}

/** The analysis worker's answer to the request with the same id. */
export type AnalysisReply =
  | { readonly id: number; readonly kind: "found"; readonly analysis: MusicAnalysis }
  | { readonly id: number; readonly kind: "failed"; readonly message: string };
