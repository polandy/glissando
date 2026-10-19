import {
  checkMusicFadeMs,
  checkMusicTrim,
  checkMusicVolumeDb,
  checkPictureChanges,
  type MusicTrim,
  type PictureChanges,
} from "./own-music";
import { songIndex } from "./slideshow-edits-songs";
import type { StoredMusic, StoredSlideshow } from "./stored-slideshow";

/**
 * The editing of a song of the slideshow's playlist, addressed by its id: its excerpt, fades and
 * picture changes. Pure functions over the stored record; the caller stores the result.
 */

/** Plays only `trim` of the music; `undefined` or the whole track deletes the field (ADR-0009). */
export function setMusicTrim(
  slideshow: StoredSlideshow,
  songId: string,
  trim: MusicTrim | undefined,
): StoredSlideshow {
  return editSong(slideshow, songId, (music) => {
    delete music.trim;
    if (trim === undefined) {
      return music;
    }
    const checked = checkMusicTrim(
      trim,
      music.durationMs,
      `slideshow "${slideshow.id}" song "${songId}"`,
    );
    const wholeTrack = checked.startMs === 0 && checked.endMs === music.durationMs;
    return wholeTrack ? music : { ...music, trim: checked };
  });
}

/** Gives the music its own fade-in in ms, 0 being off; `undefined` makes it automatic again. */
export function setMusicFadeIn(
  slideshow: StoredSlideshow,
  songId: string,
  fadeInMs: number | undefined,
): StoredSlideshow {
  return editSong(slideshow, songId, (music) => {
    delete music.fadeInMs;
    return fadeInMs === undefined
      ? music
      : {
          ...music,
          fadeInMs: checkMusicFadeMs(
            fadeInMs,
            "fadeInMs",
            `slideshow "${slideshow.id}" song "${songId}"`,
          ),
        };
  });
}

/** Gives the music its own fade-out in ms, 0 being off; `undefined` makes it automatic again. */
export function setMusicFadeOut(
  slideshow: StoredSlideshow,
  songId: string,
  fadeOutMs: number | undefined,
): StoredSlideshow {
  return editSong(slideshow, songId, (music) => {
    delete music.fadeOutMs;
    return fadeOutMs === undefined
      ? music
      : {
          ...music,
          fadeOutMs: checkMusicFadeMs(
            fadeOutMs,
            "fadeOutMs",
            `slideshow "${slideshow.id}" song "${songId}"`,
          ),
        };
  });
}

/** Changes the pictures evenly with `"even"`; `undefined` puts them on the beat again (ADR-0021). */
export function setMusicPictureChanges(
  slideshow: StoredSlideshow,
  songId: string,
  pictureChanges: PictureChanges | undefined,
): StoredSlideshow {
  return editSong(slideshow, songId, (music) => {
    delete music.pictureChanges;
    return pictureChanges === undefined
      ? music
      : {
          ...music,
          pictureChanges: checkPictureChanges(
            pictureChanges,
            `slideshow "${slideshow.id}" song "${songId}"`,
          ),
        };
  });
}

/**
 * Gives the music its own volume in whole dB off the levelled default; `undefined` or `0`, the
 * levelled default itself, deletes the field (ADR-0040) so it is never stored as a literal 0.
 */
export function setMusicVolume(
  slideshow: StoredSlideshow,
  songId: string,
  volumeDb: number | undefined,
): StoredSlideshow {
  return editSong(slideshow, songId, (music) => {
    delete music.volumeDb;
    return volumeDb === undefined || volumeDb === 0
      ? music
      : {
          ...music,
          volumeDb: checkMusicVolumeDb(volumeDb, `slideshow "${slideshow.id}" song "${songId}"`),
        };
  });
}

/** `edit` receives a mutable copy of the song; throws when the slideshow does not play it. */
function editSong(
  slideshow: StoredSlideshow,
  songId: string,
  edit: (music: { -readonly [Key in keyof StoredMusic]: StoredMusic[Key] }) => StoredMusic,
): StoredSlideshow {
  const index = songIndex(slideshow, songId);
  // songIndex only returns the index of a song the playlist has.
  const song = slideshow.songs[index] as StoredMusic;
  return { ...slideshow, songs: slideshow.songs.with(index, edit({ ...song })) };
}
