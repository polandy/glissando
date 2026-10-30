import type { SongLoudness } from "../../compose/song-loudness";
import type { MusicLoudness } from "../../loudness";
import type { LoudnessPassState } from "../../library/loudness-pass";

/**
 * What the music editor knows of a track's loudness: found, undecodable on this device, or still
 * being measured — also when a measurement failed otherwise, as the next pass tries again.
 */
export type LoudnessStatus =
  | { readonly kind: "known"; readonly loudness: MusicLoudness }
  | { readonly kind: "listening" }
  | { readonly kind: "undecodable" };

/** While the stored loudness is read. */
export const READING_LOUDNESS = "reading";

/** The pass stores before it publishes, so what it found is never older than `stored`. */
export function loudnessStatus(
  musicId: string,
  stored: MusicLoudness | undefined | typeof READING_LOUDNESS,
  pass: LoudnessPassState,
): LoudnessStatus {
  const loudness = pass.found.get(musicId) ?? (stored === READING_LOUDNESS ? undefined : stored);
  if (loudness !== undefined) {
    return { kind: "known", loudness };
  }
  return pass.undecodable.has(musicId) ? { kind: "undecodable" } : { kind: "listening" };
}

/** `loudness` composed for `playlistEnergy`: a song not measured yet is left out (ADR-0046). */
export function composedLoudness(loudness: ReadonlyMap<string, LoudnessStatus>): SongLoudness {
  const known = new Map<string, MusicLoudness>();
  for (const [songId, status] of loudness) {
    if (status.kind === "known") {
      known.set(songId, status.loudness);
    }
  }
  return known;
}
