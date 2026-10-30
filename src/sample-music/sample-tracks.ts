// The nine tracks Glissando ships with (dev-docs/library/SAMPLE_MUSIC.md), published in
// polandy/glissando-assets music/ (ADR-0042). Mood text is message-catalogue data, kept with the
// UI that shows it, not here.

export type SampleTrackId =
  | "hold-the-frame"
  | "through-the-rain-slicked-glass"
  | "before-the-world-awakens"
  | "seven-floors-above"
  | "morning-latitude"
  | "top-down-cruising"
  | "arrival-at-dawn"
  | "where-the-mountains-meet"
  | "the-view-from-the-summit";

export interface SampleTrack {
  /** The file name without its extension, e.g. fetched as `<id>.mp3`. */
  readonly id: SampleTrackId;
  readonly title: string;
  readonly durationMs: number;
  readonly bytes: number;
  /** Base64, checked against a download's own hash by sha256.ts (ADR-0042). */
  readonly sha256: string;
}

// prettier-ignore
export const SAMPLE_TRACKS: readonly SampleTrack[] = [
  { id: "hold-the-frame", title: "Hold the Frame", durationMs: 175_099, bytes: 4_208_494,
    sha256: "4TIPSmj7JOZuSeJUIWA1nZsISEpI7DMQomP1+OAd1kk=" },
  { id: "through-the-rain-slicked-glass", title: "Through the Rain-Slicked Glass",
    durationMs: 167_654, bytes: 4_029_817, sha256: "9MK5RhsPikaZKUyPSIOUpnb+WDo/T7frOpT4CVij5Ts=" },
  { id: "before-the-world-awakens", title: "Before the World Awakens", durationMs: 175_282,
    bytes: 4_212_883, sha256: "SpBgdm3qq8HsTmEwz2YXnJvDVPp1S6FVdsJjoD80ylw=" },
  { id: "seven-floors-above", title: "Seven Floors Above", durationMs: 171_337, bytes: 4_118_215,
    sha256: "st9aCZGqT7b4H5IvEirnYPWPVmBpLzS7y3WibMFnB10=" },
  { id: "morning-latitude", title: "Morning Latitude", durationMs: 176_640, bytes: 4_245_484,
    sha256: "s05+9w+NomwCgAHjeS43Xl8LNErEx8VL+qplaIL5FPI=" },
  { id: "top-down-cruising", title: "Top Down Cruising", durationMs: 166_870, bytes: 4_011_009,
    sha256: "sxSQlziII4XDW9j+4+Fugs/5AvyT3z0g9/iRAn8T5dw=" },
  { id: "arrival-at-dawn", title: "Arrival at Dawn", durationMs: 169_718, bytes: 4_079_345,
    sha256: "xidGiTLRe2ClLZwyVdvC6BKxhgv8ydggDEcTIEK3TrM=" },
  { id: "where-the-mountains-meet", title: "Where the Mountains Meet", durationMs: 180_767,
    bytes: 4_344_541, sha256: "VglafsZ0ssAVzFycDdfERMRmnd7URINLc39NGkATT9U=" },
  { id: "the-view-from-the-summit", title: "The View from the Summit", durationMs: 178_312,
    bytes: 4_285_608, sha256: "sk3pmI4N54M6oe8o03rCbjAZezkLNVEz7shtwM4LWkM=" },
];

const MP3_EXTENSION = ".mp3";
const SAMPLE_MEDIA_ID_PREFIX = "sample-";

/** The media id a sample track is stored under once added, shared by every slideshow (ADR-0042). */
export function sampleMediaId(id: SampleTrackId): string {
  return `${SAMPLE_MEDIA_ID_PREFIX}${id}`;
}

export function sampleTrackUrl(baseUrl: string, id: SampleTrackId): string {
  return `${baseUrl}${id}${MP3_EXTENSION}`;
}

/** The file name a sample track carries once added, as a picked MP3 would be named. */
export function sampleFileName(track: SampleTrack): string {
  return `${track.title}${MP3_EXTENSION}`;
}
