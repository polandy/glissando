import type { PictureFocus } from "../../../library/picture-focus";
import type { SlideshowMood } from "../../../library/slideshow-mood";
import type { StoredSlideshow } from "../../../library/stored-slideshow";
import type { Slideshow } from "../../../player";
import { composeSlideshow, type SlideshowSources } from "../../../compose/compose-slideshow";
import type { SongBeats } from "../../../compose/playlist";
import type { SongLoudness } from "../../../compose/song-loudness";

/**
 * The Mood sheet's preview loops on the slideshow's first four slide units (MOOD.md), without
 * composing the whole slideshow.
 */
export const PREVIEW_PICTURE_COUNT = 4;

/**
 * Composes the Mood sheet's live preview: the stored slideshow's first `PREVIEW_PICTURE_COUNT`
 * pictures under `shownMood` — a candidate the user has not chosen yet, so it is never written
 * to `stored`. No opening or closing card and no chapters, since the preview loops on pictures
 * alone. Pure: `stored` is read, never changed.
 */
export function moodPreviewSlideshow(
  stored: StoredSlideshow,
  shownMood: SlideshowMood | undefined,
  sources: SlideshowSources,
  focus: ReadonlyMap<string, PictureFocus>,
  beats: SongBeats,
  loudness: SongLoudness,
  locale: string,
): Slideshow {
  const preview: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...stored,
    pictures: stored.pictures.slice(0, PREVIEW_PICTURE_COUNT),
    automaticChaptersOff: true,
  };
  delete preview.openingCard;
  delete preview.closingCard;
  delete preview.addedChapters;
  delete preview.chapterEdits;
  delete preview.mood;
  if (shownMood !== undefined) {
    preview.mood = shownMood;
  }
  return composeSlideshow(preview, sources, focus, beats, loudness, locale);
}

/**
 * `slideshow` with its music silenced, for the preview's "Sound" toggle off (MOOD.md): pure, so
 * the player is recreated (via a `{#key}` on this new object) to pick the change up.
 */
export function mutedPreviewSlideshow(slideshow: Slideshow): Slideshow {
  if (slideshow.music === undefined) {
    return slideshow;
  }
  return { ...slideshow, music: slideshow.music.map((track) => ({ ...track, gain: 0 })) };
}
