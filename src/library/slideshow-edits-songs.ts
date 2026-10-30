import { checkBetweenSongs, checkOwnMusicFields, type BetweenSongs } from "./own-music";
import type { StoredMusic, StoredSlideshow } from "./stored-slideshow";

/**
 * The editing of the slideshow's playlist (ADR-0023): which songs play, in which order, and how
 * one hands over to the next. Pure functions over the stored record; the caller stores the result.
 * A removed song's media goes with the clean-up of unreferenced media.
 */

/** Appends `songs` to the playlist in the order given; refuses a song it already has. */
export function addSongs(
  slideshow: StoredSlideshow,
  songs: readonly StoredMusic[],
): StoredSlideshow {
  const known = new Set(slideshow.songs.map(({ id }) => id));
  for (const song of songs) {
    if (known.has(song.id)) {
      throw new Error(`slideshow "${slideshow.id}" already has song "${song.id}"; add it once`);
    }
    known.add(song.id);
    checkOwnMusicFields(song, `slideshow "${slideshow.id}" song "${song.id}"`);
  }
  return { ...slideshow, songs: [...slideshow.songs, ...songs] };
}

/** Takes the song out of the playlist; the others keep their order and own settings. */
export function removeSong(slideshow: StoredSlideshow, songId: string): StoredSlideshow {
  const index = songIndex(slideshow, songId);
  return { ...slideshow, songs: slideshow.songs.toSpliced(index, 1) };
}

/** Moves the song to `toIndex` of the playlist, its own settings with it. */
export function moveSong(
  slideshow: StoredSlideshow,
  songId: string,
  toIndex: number,
): StoredSlideshow {
  const lastIndex = slideshow.songs.length - 1;
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex > lastIndex) {
    throw new RangeError(
      `slideshow "${slideshow.id}" song "${songId}": expected a place from 0 to ${lastIndex}, got ${toIndex}`,
    );
  }
  const index = songIndex(slideshow, songId);
  // songIndex only returns the index of a song the playlist has.
  const song = slideshow.songs[index] as StoredMusic;
  return { ...slideshow, songs: slideshow.songs.toSpliced(index, 1).toSpliced(toIndex, 0, song) };
}

/** Plays the songs one after another with `"sequence"`; `undefined` crossfades them again. */
export function setBetweenSongs(
  slideshow: StoredSlideshow,
  betweenSongs: BetweenSongs | undefined,
): StoredSlideshow {
  const crossfading: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...slideshow,
  };
  delete crossfading.betweenSongs;
  return betweenSongs === undefined
    ? crossfading
    : {
        ...crossfading,
        betweenSongs: checkBetweenSongs(betweenSongs, `slideshow "${slideshow.id}"`),
      };
}

/**
 * Repeats the playlist from its first song, joined like any two songs, for as long as the
 * slideshow lasts, instead of the automatic pictures shrinking to fit a shorter one; `undefined`
 * plays it once through (ADR-0047).
 */
export function setRepeatMusic(
  slideshow: StoredSlideshow,
  repeatMusic: true | undefined,
): StoredSlideshow {
  const onceThrough: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...slideshow,
  };
  delete onceThrough.repeatMusic;
  return repeatMusic === undefined ? onceThrough : { ...onceThrough, repeatMusic };
}

/** Where the song is in the playlist; throws when the slideshow does not play it. */
export function songIndex(slideshow: StoredSlideshow, songId: string): number {
  const index = slideshow.songs.findIndex(({ id }) => id === songId);
  if (index === -1) {
    throw new Error(`slideshow "${slideshow.id}" has no song "${songId}"`);
  }
  return index;
}
