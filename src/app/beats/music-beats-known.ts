import { NO_BEATS, type MusicBeats } from "../../beats";
import type { BeatPassState } from "../../library/beat-pass";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";

/**
 * The beats found so far for the slideshow's music, which the player and the exports compose with
 * (ADR-0021). None while not listened to yet; beats that cannot be read are logged and play goes
 * on evenly, as the beats only place the automatic changes.
 */
export async function storedMusicBeats(
  store: Pick<LibraryStore, "musicBeats">,
  stored: StoredSlideshow,
  log: (error: unknown) => void,
): Promise<MusicBeats> {
  if (stored.music === undefined) {
    return NO_BEATS;
  }
  try {
    return (await store.musicBeats(stored.music.id)) ?? NO_BEATS;
  } catch (error) {
    log(error);
    return NO_BEATS;
  }
}

/**
 * What the music editor knows of a track's beats: found (beats or none), undecodable on this
 * device, or still being listened for — also when a detection failed otherwise, as the next pass
 * tries again.
 */
export type BeatsStatus =
  | { readonly kind: "known"; readonly beats: MusicBeats }
  | { readonly kind: "listening" }
  | { readonly kind: "undecodable" };

/** While the stored beats are read. */
export const READING_BEATS = "reading";

/** The pass stores before it publishes, so what it found is never older than `stored`. */
export function beatsStatus(
  musicId: string,
  stored: MusicBeats | undefined | typeof READING_BEATS,
  pass: BeatPassState,
): BeatsStatus {
  const beats = pass.found.get(musicId) ?? (stored === READING_BEATS ? undefined : stored);
  if (beats !== undefined) {
    return { kind: "known", beats };
  }
  return pass.undecodable.has(musicId) ? { kind: "undecodable" } : { kind: "listening" };
}

/** The beats an editor composes with: until a result is known, the pictures share the music evenly. */
export function composedBeats(status: BeatsStatus): MusicBeats {
  return status.kind === "known" ? status.beats : NO_BEATS;
}
