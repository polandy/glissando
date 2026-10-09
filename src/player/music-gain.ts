import { MILLISECONDS_PER_SECOND, type Music } from "./slideshow";

/**
 * The music's volume as a pure function of slideshow time (0 being the excerpt's start), so
 * play, pause and seek all land on the same envelope without a jump. See ADR-0009.
 */
export function musicGainAt(music: Music, timeMs: number): number {
  const endMs = music.endMs ?? Number.POSITIVE_INFINITY;
  const heardMs = endMs - music.startMs;
  if (timeMs < 0 || timeMs >= heardMs) {
    return 0;
  }
  const fadeInGain = music.fadeInMs > 0 ? timeMs / music.fadeInMs : 1;
  const fadeOutGain = music.fadeOutMs > 0 ? (heardMs - timeMs) / music.fadeOutMs : 1;
  return Math.min(1, fadeInGain, fadeOutGain);
}

/** Where in the track slideshow time `timeMs` plays, in seconds. */
export function musicTrackSeconds(music: Music, timeMs: number): number {
  return (music.startMs + timeMs) / MILLISECONDS_PER_SECOND;
}

/** Whether the music is still heard at slideshow time `timeMs`. */
export function isMusicHeardAt(music: Music, timeMs: number): boolean {
  return music.endMs === undefined || music.startMs + timeMs < music.endMs;
}
