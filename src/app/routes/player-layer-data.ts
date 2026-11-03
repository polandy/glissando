import { composeSlideshow, type SongBeats, type SongLoudness } from "../../compose";
import type { Slideshow } from "../../player";
import type { LibraryStore } from "../../library/library-store";
import type { PictureFocus } from "../../library/picture-focus";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { storedSongBeats } from "../beats/music-beats-known";
import { bareFocus, NO_FOCUS_KNOWN } from "../focus/pictures-focus";
import { storedSongLoudness } from "../loudness/music-loudness-composed";
import { browserObjectUrls } from "../media/object-urls";
import { loadPlayerMusic } from "./route-loading";

/** What the player waits for before it can play: the music's URLs and the automatic choices' inputs. */
export interface PlayerData {
  readonly musicUrls: ReadonlyMap<string, string>;
  readonly focus: ReadonlyMap<string, PictureFocus>;
  readonly beats: SongBeats;
  readonly loudness: SongLoudness;
}

type PlayerDataStore = Pick<
  LibraryStore,
  "musicBlob" | "pictureFocus" | "musicBeats" | "musicLoudness"
>;

/**
 * Reads the player's data, or null once `signal` aborts. Play waits on the focus and beats found
 * so far, never on the search for the rest. Both only place automatic choices: unread, the
 * motions aim at the middle, the pictures share the music evenly and play goes on.
 */
export async function loadPlayerData(
  store: PlayerDataStore,
  stored: StoredSlideshow,
  log: (error: unknown) => void,
  signal: AbortSignal,
): Promise<PlayerData | null> {
  const [music, focus, beats, loudness] = await Promise.all([
    loadPlayerMusic(store, stored, browserObjectUrls.create, signal),
    store
      .pictureFocus(stored.pictures.map((picture) => picture.id))
      .then(bareFocus, (error: unknown) => {
        log(error);
        return NO_FOCUS_KNOWN.found;
      }),
    storedSongBeats(store, stored, log),
    storedSongLoudness(store, stored, log),
  ]);
  return music === null ? null : { musicUrls: music.urls, focus, beats, loudness };
}

/** The slideshow to play: `played` with the loaded music, focus and beats, pictures by media id. */
export function composePlayerSlideshow(
  played: StoredSlideshow,
  data: PlayerData,
  slideshowId: string,
  language: string,
): Slideshow {
  return composeSlideshow(
    played,
    {
      picture: (id) => id,
      video: (id) => id,
      music: (id) => {
        const url = data.musicUrls.get(id);
        if (url === undefined) {
          throw new Error(`slideshow "${slideshowId}" plays song "${id}" but it was not loaded`);
        }
        return url;
      },
    },
    data.focus,
    data.beats,
    data.loudness,
    language,
  );
}
