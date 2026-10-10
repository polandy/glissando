/**
 * Why the player stopped short: a picture could not be loaded, Immich did not answer for a server
 * slideshow's picture, or playback failed.
 */
export type PlayerFailure = "picture" | "immich" | "playback";
