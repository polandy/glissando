import {
  checkMusicFadeMs,
  checkMusicTrim,
  checkPictureChanges,
  type MusicTrim,
  type PictureChanges,
} from "./own-music";
import type { StoredMusic, StoredSlideshow } from "./stored-slideshow";

/**
 * The editing of a slideshow's music: its excerpt, fades and picture changes. Pure functions over
 * the stored record; the caller stores the result.
 */

/** Plays only `trim` of the music; `undefined` or the whole track deletes the field (ADR-0009). */
export function setMusicTrim(
  slideshow: StoredSlideshow,
  trim: MusicTrim | undefined,
): StoredSlideshow {
  return editMusic(slideshow, (music) => {
    delete music.trim;
    if (trim === undefined) {
      return music;
    }
    const checked = checkMusicTrim(trim, music.durationMs, `slideshow "${slideshow.id}" music`);
    const wholeTrack = checked.startMs === 0 && checked.endMs === music.durationMs;
    return wholeTrack ? music : { ...music, trim: checked };
  });
}

/** Gives the music its own fade-in in ms, 0 being off; `undefined` makes it automatic again. */
export function setMusicFadeIn(
  slideshow: StoredSlideshow,
  fadeInMs: number | undefined,
): StoredSlideshow {
  return editMusic(slideshow, (music) => {
    delete music.fadeInMs;
    return fadeInMs === undefined
      ? music
      : {
          ...music,
          fadeInMs: checkMusicFadeMs(fadeInMs, "fadeInMs", `slideshow "${slideshow.id}" music`),
        };
  });
}

/** Gives the music its own fade-out in ms, 0 being off; `undefined` makes it automatic again. */
export function setMusicFadeOut(
  slideshow: StoredSlideshow,
  fadeOutMs: number | undefined,
): StoredSlideshow {
  return editMusic(slideshow, (music) => {
    delete music.fadeOutMs;
    return fadeOutMs === undefined
      ? music
      : {
          ...music,
          fadeOutMs: checkMusicFadeMs(fadeOutMs, "fadeOutMs", `slideshow "${slideshow.id}" music`),
        };
  });
}

/** `edit` receives a mutable copy of the music; throws when the slideshow has none. */
/** Changes the pictures evenly with `"even"`; `undefined` puts them on the beat again (ADR-0021). */
export function setMusicPictureChanges(
  slideshow: StoredSlideshow,
  pictureChanges: PictureChanges | undefined,
): StoredSlideshow {
  return editMusic(slideshow, (music) => {
    delete music.pictureChanges;
    return pictureChanges === undefined
      ? music
      : {
          ...music,
          pictureChanges: checkPictureChanges(pictureChanges, `slideshow "${slideshow.id}" music`),
        };
  });
}

function editMusic(
  slideshow: StoredSlideshow,
  edit: (music: { -readonly [Key in keyof StoredMusic]: StoredMusic[Key] }) => StoredMusic,
): StoredSlideshow {
  if (slideshow.music === undefined) {
    throw new Error(`slideshow "${slideshow.id}" has no music to edit`);
  }
  return { ...slideshow, music: edit({ ...slideshow.music }) };
}
