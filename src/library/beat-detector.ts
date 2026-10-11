import type { MusicBeats } from "../beats";

/** Finds the beats of a stored music file (see ADR-0021). */
export interface BeatDetector {
  /**
   * Rejects with `MusicUndecodableError` when the music cannot be decoded, with
   * `BeatDetectorGoneError` once the detector can listen to no music any more.
   */
  detect(music: Blob): Promise<MusicBeats>;
}

/** The detector itself is gone (its worker crashed): every later detection would fail too. */
export class BeatDetectorGoneError extends Error {
  override readonly name = "BeatDetectorGoneError";
}

/** This device cannot decode the music, so its beats cannot be listened for here. */
export class MusicUndecodableError extends Error {
  override readonly name = "MusicUndecodableError";

  constructor(options?: ErrorOptions) {
    super("the music cannot be decoded", options);
  }
}
