import type { MusicBeats } from "../beats";
import { EVEN_PICTURE_CHANGES } from "../library/own-music";
import type { StoredMusic } from "../library/stored-slideshow";
import { musicExcerpt } from "./music-excerpt";

/**
 * The beats the pictures change on, in ms of the music's excerpt: those strictly inside it.
 * Absent without music, without a clear beat, or when the music's picture changes are even
 * (ADR-0021).
 */
export function excerptBeatsMs(
  music: StoredMusic | undefined,
  beats: MusicBeats,
): readonly number[] | undefined {
  if (
    music === undefined ||
    beats.kind === "none" ||
    music.pictureChanges === EVEN_PICTURE_CHANGES
  ) {
    return undefined;
  }
  const { startMs, endMs } = musicExcerpt(music);
  return beats.beatsMs
    .filter((beatMs) => beatMs > startMs && beatMs < endMs)
    .map((beatMs) => beatMs - startMs);
}
