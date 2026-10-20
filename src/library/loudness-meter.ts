import type { MusicLoudness } from "../loudness";

/** Measures the loudness of a stored music file (ADR-0040). */
export interface LoudnessMeter {
  /**
   * Rejects with `MusicUnmeasurableError` when the music cannot be decoded, with
   * `LoudnessMeterGoneError` once the meter can measure no music any more.
   */
  measure(music: Blob): Promise<MusicLoudness>;
}

/** The meter itself is gone (its worker crashed): every later measurement would fail too. */
export class LoudnessMeterGoneError extends Error {
  override readonly name = "LoudnessMeterGoneError";
}

/** This device cannot decode the music, so its loudness cannot be measured here. */
export class MusicUnmeasurableError extends Error {
  override readonly name = "MusicUnmeasurableError";

  constructor(options?: ErrorOptions) {
    super("the music cannot be decoded", options);
  }
}
