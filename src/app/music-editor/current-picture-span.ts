import type { MusicEditorView } from "./music-editor-view";

/** A run of track time one picture shows for. */
export interface PictureSpan {
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * The run of the picture showing at `positionMs` of `music`'s track: from the slide change
 * before it (or the run's own start) to the one after it (or the run's own end, where the
 * slideshow stops playing the song, ADR-0023). Null outside that run, or while the slideshow
 * never reaches the song.
 */
export function currentPictureSpan(music: MusicEditorView, positionMs: number): PictureSpan | null {
  const runEndMs = Math.min(music.durationMs, music.startMs + music.slideshowMs - music.atMs);
  if (!music.reached || positionMs < music.startMs || positionMs > runEndMs) {
    return null;
  }
  let startMs = music.startMs;
  let endMs = runEndMs;
  for (const change of music.slideChanges) {
    if (change.atMs <= positionMs) {
      startMs = change.atMs;
    } else {
      endMs = change.atMs;
      break;
    }
  }
  return { startMs, endMs };
}
