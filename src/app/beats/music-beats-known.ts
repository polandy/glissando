import { NO_BEATS, type MusicBeats } from "../../beats";
import type { SongBeats } from "../../compose";
import type { BeatPassState } from "../../library/beat-pass";
import type { LibraryStore } from "../../library/library-store";
import type { StoredSlideshow } from "../../library/stored-slideshow";

/**
 * The beats found so far for each song of the slideshow, which the player and the exports compose
 * with (ADR-0021, ADR-0023). A song not listened to yet is absent; beats that cannot be read are
 * logged and that song plays evenly, as the beats only place the automatic changes.
 */
export async function storedSongBeats(
  store: Pick<LibraryStore, "musicBeats">,
  stored: StoredSlideshow,
  log: (error: unknown) => void,
): Promise<SongBeats> {
  const found = await Promise.all(
    stored.songs.map(async ({ id }): Promise<[string, MusicBeats] | undefined> => {
      try {
        const beats = await store.musicBeats(id);
        return beats === undefined ? undefined : [id, beats];
      } catch (error) {
        log(error);
        return undefined;
      }
    }),
  );
  return new Map(found.filter((entry) => entry !== undefined));
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
