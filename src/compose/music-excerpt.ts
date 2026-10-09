import { MUSIC_FADE_OFF_MS, MUSIC_FADE_SHORT_MS, type MusicTrim } from "../library/own-music";
import type { StoredMusic } from "../library/stored-slideshow";

/**
 * Where the music plays and how it fades, resolved from the stored music and the slideshow's
 * length: the player only receives these numbers. See ADR-0009.
 */

/** An automatic fade is the short one, wherever the music is cut. */
export const AUTOMATIC_MUSIC_FADE_MS = MUSIC_FADE_SHORT_MS;

/** The music as the player plays it, in ms of the track. */
export interface MusicTiming {
  readonly startMs: number;
  /** Where the music stops being heard: the excerpt's end or the slideshow's, the earlier. */
  readonly endMs: number;
  readonly fadeInMs: number;
  readonly fadeOutMs: number;
}

/** The part of the track that plays: the trim, or the whole track. */
export function musicExcerpt(music: StoredMusic): MusicTrim {
  return music.trim ?? { startMs: 0, endMs: music.durationMs };
}

/** How long the excerpt is; what the slides share (ADR-0008). Absent without music. */
export function musicExcerptMs(music: StoredMusic | undefined): number | undefined {
  if (music === undefined) {
    return undefined;
  }
  const { startMs, endMs } = musicExcerpt(music);
  return endMs - startMs;
}

/** Where in the track the music stops being heard: a shorter slideshow ends it early. */
export function audibleEndMs(music: StoredMusic, slideshowMs: number): number {
  const { startMs, endMs } = musicExcerpt(music);
  return Math.min(endMs, startMs + slideshowMs);
}

/** Short when the excerpt starts mid-track; off when the track plays from its start. */
export function automaticFadeInMs(music: StoredMusic): number {
  return musicExcerpt(music).startMs > 0 ? AUTOMATIC_MUSIC_FADE_MS : MUSIC_FADE_OFF_MS;
}

/** Short when the music stops before the track's end; off when the track ends by itself. */
export function automaticFadeOutMs(music: StoredMusic, slideshowMs: number): number {
  return audibleEndMs(music, slideshowMs) < music.durationMs
    ? AUTOMATIC_MUSIC_FADE_MS
    : MUSIC_FADE_OFF_MS;
}

/**
 * The excerpt with its own or automatic fades, ending where it stops being heard. Fades that
 * together outlast what is heard are scaled down in proportion.
 */
export function resolveMusicTiming(music: StoredMusic, slideshowMs: number): MusicTiming {
  const { startMs } = musicExcerpt(music);
  const endMs = audibleEndMs(music, slideshowMs);
  const fadeInMs = music.fadeInMs ?? automaticFadeInMs(music);
  const fadeOutMs = music.fadeOutMs ?? automaticFadeOutMs(music, slideshowMs);
  const heardMs = endMs - startMs;
  const fadesMs = fadeInMs + fadeOutMs;
  if (fadesMs <= heardMs) {
    return { startMs, endMs, fadeInMs, fadeOutMs };
  }
  const scale = heardMs / fadesMs;
  return {
    startMs,
    endMs,
    fadeInMs: Math.floor(fadeInMs * scale),
    fadeOutMs: Math.floor(fadeOutMs * scale),
  };
}
