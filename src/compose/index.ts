/**
 * The automatic choices that turn imported media into a playable slideshow ("good by default"),
 * see `dev-docs/COMPOSITION.md`. Pure, framework-free functions; no I/O.
 */

export { orderByCaptureDate } from "./order-by-capture-date";
export { slideDurationsMs } from "./slide-durations-ms";
export { autoKenBurns } from "./auto-ken-burns";
export { autoTransition } from "./auto-transition";
export { titleForCaptureRange } from "./title-for-capture-range";
export { buildStoredSlideshow, type BuildStoredSlideshowInput } from "./build-stored-slideshow";
export { composeSlideshow, type SlideshowSources } from "./compose-slideshow";
export { slideshowDurationMs } from "./slideshow-duration-ms";
