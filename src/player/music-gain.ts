import { MILLISECONDS_PER_SECOND, type MusicTrack } from "./slideshow";

/** What the volume follows: a track without its source and place. */
export type MusicEnvelope = Pick<MusicTrack, "startMs" | "endMs" | "fadeInMs" | "fadeOutMs">;

/** What a placed track's volume follows. */
export type PlacedMusicEnvelope = MusicEnvelope & Pick<MusicTrack, "atMs">;

/**
 * The music's volume as a pure function of slideshow time (0 being the excerpt's start), so
 * play, pause and seek all land on the same envelope without a jump. See ADR-0009.
 */
export function musicGainAt(music: MusicEnvelope, timeMs: number): number {
  const heardMs = music.endMs - music.startMs;
  if (timeMs < 0 || timeMs >= heardMs) {
    return 0;
  }
  const fadeInGain = music.fadeInMs > 0 ? timeMs / music.fadeInMs : 1;
  const fadeOutGain = music.fadeOutMs > 0 ? (heardMs - timeMs) / music.fadeOutMs : 1;
  return Math.min(1, fadeInGain, fadeOutGain);
}

/**
 * A track's volume at slideshow time `timeMs`: silent before its `atMs` and after its end, so the
 * tracks of a playlist, two at once in a crossfade, each follow their own envelope (ADR-0023).
 */
export function trackGainAt(track: PlacedMusicEnvelope, timeMs: number): number {
  return musicGainAt(track, timeMs - track.atMs);
}

/** Where in the track slideshow time `timeMs` plays, in seconds. */
export function trackSecondsAt(track: PlacedMusicEnvelope, timeMs: number): number {
  return (track.startMs + timeMs - track.atMs) / MILLISECONDS_PER_SECOND;
}

/** Whether the track is heard at slideshow time `timeMs`: from its `atMs` until its end. */
export function isTrackHeardAt(track: PlacedMusicEnvelope, timeMs: number): boolean {
  const intoTrackMs = timeMs - track.atMs;
  return intoTrackMs >= 0 && intoTrackMs < track.endMs - track.startMs;
}

/** How long the music takes to rise when the show starts part-way. */
export const START_FADE_IN_MS = 1000;

/**
 * The factor the music's volume is multiplied by for a show started part-way at `fromMs`: a
 * linear rise from silence there to full over `START_FADE_IN_MS`, a pure function of play time.
 * Before `fromMs` it is full, so a replay from the beginning is untouched.
 */
export function startFadeGainAt(fromMs: number, timeMs: number): number {
  if (timeMs < fromMs) {
    return 1;
  }
  return Math.min(1, (timeMs - fromMs) / START_FADE_IN_MS);
}
