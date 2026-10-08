/** Events named and ordered as on an HTML media element. */
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
] as const;
export type PlayerEvent = (typeof PLAYER_EVENTS)[number];
