import type { MusicBeats } from "../beats";
import type { MusicLoudness } from "../loudness";

/** What one decode of a music file yields: its beats (ADR-0021) and its loudness (ADR-0040). */
export interface MusicAnalysis {
  readonly beats: MusicBeats;
  readonly loudness: MusicLoudness;
}

/** Decodes a stored music file once and finds its beats and loudness from it (ADR-0051). */
export interface MusicAnalyser {
  /**
   * Rejects with `MusicUndecodableError` when the music cannot be decoded, with
   * `MusicAnalyserGoneError` once the analyser can analyse no music any more.
   */
  analyse(music: Blob): Promise<MusicAnalysis>;
}

/** The analyser itself is gone (its worker crashed): every later analysis would fail too. */
export class MusicAnalyserGoneError extends Error {
  override readonly name = "MusicAnalyserGoneError";
}

/** This device cannot decode the music, so it cannot be analysed here. */
export class MusicUndecodableError extends Error {
  override readonly name = "MusicUndecodableError";

  constructor(options?: ErrorOptions) {
    super("the music cannot be decoded", options);
  }
}
