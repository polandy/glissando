/** Events named and ordered as on an HTML media element, plus `clipskipped`. */
export const PLAYER_EVENTS = [
  "canplay",
  "play",
  "playing",
  "waiting",
  "pause",
  "seeked",
  "timeupdate",
  "ended",
  "error",
  /** A clip was refused; its poster stays and the show goes on. */
  "clipskipped",
] as const;
export type PlayerEvent = (typeof PLAYER_EVENTS)[number];
