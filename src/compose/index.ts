/**
 * The automatic choices that turn imported media into a playable slideshow ("good by default"),
 * see `dev-docs/COMPOSITION.md`. Pure, framework-free functions; no I/O.
 */

export { orderByCaptureDate } from "./order-by-capture-date";
export { slideDurationsMs } from "./slide-durations-ms";
export { autoKenBurns, KEN_BURNS_EASING } from "./auto-ken-burns";
export { pictureKenBurns } from "./picture-ken-burns";
export {
  autoTransitionEffect,
  transitionDurationMs,
  MAX_TRANSITION_DURATION_MS,
  TRANSITION_SHARE_OF_SLIDE,
} from "./auto-transition";
export { automaticTransition, pictureTransition, slideshowTransition } from "./picture-transition";
export { titleForCaptureRange } from "./title-for-capture-range";
export { buildStoredSlideshow, type BuildStoredSlideshowInput } from "./build-stored-slideshow";
export { composeSlideshow, type SlideshowSources } from "./compose-slideshow";
export { slideshowDurationMs } from "./slideshow-duration-ms";
export {
  AUTOMATIC_MUSIC_FADE_MS,
  audibleEndMs,
  automaticFadeInMs,
  automaticFadeOutMs,
  musicExcerpt,
  musicExcerptMs,
  resolveMusicTiming,
  type MusicTiming,
} from "./music-excerpt";
