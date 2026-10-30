import type { PictureFocus } from "../../../library/picture-focus";
import type { SlideshowMood } from "../../../library/slideshow-mood";
import type { StoredSlideshow } from "../../../library/stored-slideshow";
import type { Slideshow } from "../../../player";
import { composeSlideshow, type SlideshowSources } from "../../../compose/compose-slideshow";
import type { SongBeats } from "../../../compose/playlist";
import type { SongLoudness } from "../../../compose/song-loudness";
import { moodEnergyPacing } from "./mood-energy-pacing";
import { PREVIEW_PICTURE_COUNT, previewWindowStartIndex } from "./preview-window";

export { PREVIEW_PICTURE_COUNT, previewWindowStartIndex };

/**
 * Composes the Mood sheet's live preview: a window of `PREVIEW_PICTURE_COUNT` of the stored
 * slideshow's pictures under `shownMood` — a candidate the user has not chosen yet, so it is
 * never written to `stored`. No opening or closing card and no chapters, since the preview loops
 * on pictures alone. Pure: `stored` is read, never changed.
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
  const startIndex =
    stored.energyPacing === true
      ? previewWindowStartIndex(
          stored.pictures.length,
          moodEnergyPacing(stored, shownMood, beats, loudness).firstLiftUnitIndex,
        )
      : 0;
  const preview: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...stored,
    pictures: stored.pictures.slice(startIndex, startIndex + PREVIEW_PICTURE_COUNT),
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
 * `slideshow` without its music, for the preview's "Sound" toggle off (MOOD.md): pure, so the
 * player is recreated (via a `{#key}` on this new object) to pick the change up. Left out rather
 * than played at gain 0, so a silent preview opens no audio at all: in WebKit, songs streamed
 * through Web Audio as the sheet opens can freeze the page.
 */
export function mutedPreviewSlideshow(slideshow: Slideshow): Slideshow {
  if (slideshow.music === undefined) {
    return slideshow;
  }
  const silent = { ...slideshow };
  delete silent.music;
  return silent;
}
