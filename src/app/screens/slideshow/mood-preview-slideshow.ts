import type { PictureFocus } from "../../../library/picture-focus";
import type { SlideshowMood } from "../../../library/slideshow-mood";
import type { StoredSlideshow } from "../../../library/stored-slideshow";
import type { Slideshow } from "../../../player";
import { composeSlideshow, type SlideshowSources } from "../../../compose/compose-slideshow";
import type { SongBeats } from "../../../compose/playlist";
import type { SongLoudness } from "../../../compose/song-loudness";
import { moodEnergyPacing } from "./mood-energy-pacing";

/**
 * The Mood sheet's preview loops on four slide units (MOOD.md): the first four as usual, or —
 * with energy pacing on and a lift found (ADR-0046) — the four around the first lift.
 */
export const PREVIEW_PICTURE_COUNT = 4;

/** How many pictures the preview's window starts before a lift it centres on. */
const UNITS_BEFORE_LIFT = 2;

/**
 * The first picture of the preview's window: the first lift's unit less `UNITS_BEFORE_LIFT`,
 * clamped so the window of `PREVIEW_PICTURE_COUNT` pictures stays inside `[0, pictureCount)`; the
 * first picture without a lift to centre on.
 */
export function previewWindowStartIndex(
  pictureCount: number,
  firstLiftUnitIndex: number | undefined,
): number {
  if (firstLiftUnitIndex === undefined) {
    return 0;
  }
  const lastStart = Math.max(0, pictureCount - PREVIEW_PICTURE_COUNT);
  return Math.min(lastStart, Math.max(0, firstLiftUnitIndex - UNITS_BEFORE_LIFT));
}

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
 * `slideshow` with its music silenced, for the preview's "Sound" toggle off (MOOD.md): pure, so
 * the player is recreated (via a `{#key}` on this new object) to pick the change up.
 */
export function mutedPreviewSlideshow(slideshow: Slideshow): Slideshow {
  if (slideshow.music === undefined) {
    return slideshow;
  }
  return { ...slideshow, music: slideshow.music.map((track) => ({ ...track, gain: 0 })) };
}
