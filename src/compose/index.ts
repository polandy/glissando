/**
 * The automatic choices that turn imported media into a playable slideshow ("good by default"),
 * see `dev-docs/COMPOSITION.md`. Pure, framework-free functions; no I/O.
 */

export { orderByCaptureDate } from "./order-by-capture-date";
export { slideDurationsMs, type TimedPicture } from "./slide-durations-ms";
export { pictureDurationsMs } from "./picture-durations-ms";
export { PAIR_WEIGHT, slideOfPicture, slideUnits, timedUnit, type SlideUnit } from "./slide-units";
export {
  LAYOUT_REFERENCE_VIEWPORT,
  pictureLayoutSummaries,
  type PictureLayoutSummary,
} from "./picture-layout-summary";
export { autoKenBurns, KEN_BURNS_EASING } from "./auto-ken-burns";
export { pairKenBurns, pictureKenBurns } from "./picture-ken-burns";
export {
  autoTransitionEffect,
  transitionDurationMs,
  MAX_TRANSITION_DURATION_MS,
  TRANSITION_SHARE_OF_SLIDE,
} from "./auto-transition";
export { automaticTransition, pictureTransition, slideshowTransition } from "./picture-transition";
export { slideshowLook } from "./slideshow-look";
export { titleForCaptureRange } from "./title-for-capture-range";
export { buildStoredSlideshow, type BuildStoredSlideshowInput } from "./build-stored-slideshow";
export { composeSlideshow, type SlideshowSources } from "./compose-slideshow";
export { slideshowDurationMs } from "./slideshow-duration-ms";
export { beatTransitionDurationMs } from "./beat-transition";
export { NO_SONG_LOUDNESS, type SongLoudness } from "./song-loudness";
export { trackGain, type TrackGainInput } from "./track-gain";
export {
  CROSSFADE_MS,
  NO_SONG_BEATS,
  playlistBeatsMs,
  placeSongs,
  playlistMs,
  repeatedPlaylist,
  resolvePlaylist,
  type Playlist,
  type PlacedSong,
  type PlaylistTrack,
  type SongBeats,
} from "./playlist";
export { picturesFillMs, targetSecondsPerPicture } from "./filled-length";
export {
  AUTOMATIC_MUSIC_FADE_IN_MS,
  AUTOMATIC_MUSIC_FADE_OUT_MS,
  audibleEndMs,
  automaticFadeInMs,
  automaticFadeOutMs,
  musicExcerpt,
  musicExcerptMs,
  resolveMusicTiming,
  scaledFades,
  type MusicTiming,
} from "./music-excerpt";
export {
  dayNumbersOf,
  dateOfDay,
  showDays,
  type DayNumberedPicture,
  type ShowDay,
} from "./chapter-days";
export { STAY_RADIUS_KM, staysOf, type Stay } from "./chapter-stays";
export { multiDaySubtitle, singleDaySubtitle, dateOnlySubtitle, dayTitle } from "./chapter-text";
export {
  chaptersOfSlideshow,
  composedChapters,
  type ChapterKind,
  type SlideshowChapter,
} from "./chapters-of-slideshow";
export { CHAPTER_SLIDE_MS, composeChapters, type ComposedChapter } from "./compose-chapters";
