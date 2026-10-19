import type { SongLoudness } from "../../compose";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import type { MusicLoudness } from "../../loudness";

/**
 * The loudness found so far for each song of the slideshow, which the player and the exports
 * level each track's gain with (ADR-0040). A song not measured yet is absent; loudness that
 * cannot be read is logged and that song plays at its own volume alone.
 */
export async function storedSongLoudness(
  store: Pick<LibraryStore, "musicLoudness">,
  stored: StoredSlideshow,
  log: (error: unknown) => void,
): Promise<SongLoudness> {
  const found = await Promise.all(
    stored.songs.map(async ({ id }): Promise<[string, MusicLoudness] | undefined> => {
      try {
        const loudness = await store.musicLoudness(id);
        return loudness === undefined ? undefined : [id, loudness];
      } catch (error) {
        log(error);
        return undefined;
      }
    }),
  );
  return new Map(found.filter((entry) => entry !== undefined));
}
