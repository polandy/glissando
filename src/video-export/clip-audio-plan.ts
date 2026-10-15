import { isGroundSlide, MILLISECONDS_PER_SECOND, type Slide, type Slideshow } from "../player";

/** A video slide whose clip is heard: where it sits in show time and which excerpt it plays. */
export interface ClipAudioSlide {
  readonly src: string;
  /** The slide's start in show time. */
  readonly atMs: number;
  readonly startMs: number;
  readonly endMs: number;
  /** 0 to 1. */
  readonly volume: number;
}

export interface BufferSpan {
  readonly startSeconds: number;
  readonly durationSeconds: number;
}

/** Where a decoded buffer plays in an `OfflineAudioContext` rendering a window of show time. */
export interface BufferPlacement {
  readonly whenSeconds: number;
  readonly offsetSeconds: number;
  readonly durationSeconds: number;
}

/** The clips with sound, in show order; a clip at volume 0 adds nothing to the mix. */
export function clipAudioSlides(slides: readonly Slide[]): readonly ClipAudioSlide[] {
  const found: ClipAudioSlide[] = [];
  let atMs = 0;
  for (const slide of slides) {
    if (!isGroundSlide(slide) && slide.video !== undefined && slide.video.volume > 0) {
      const { src, startMs, endMs, volume } = slide.video;
      found.push({ src, atMs, startMs, endMs, volume });
    }
    atMs += slide.durationMs;
  }
  return found;
}

/** The clip seconds heard in show time `fromMs` to `toMs`; null when the slide is not in it. */
export function clipSecondsFor(
  clip: ClipAudioSlide,
  fromMs: number,
  toMs: number,
): { readonly fromSeconds: number; readonly toSeconds: number } | null {
  const slideEndMs = clip.atMs + clip.endMs - clip.startMs;
  const heardFromMs = Math.max(fromMs, clip.atMs);
  const heardToMs = Math.min(toMs, slideEndMs);
  if (heardToMs <= heardFromMs) {
    return null;
  }
  return {
    fromSeconds: (clip.startMs + heardFromMs - clip.atMs) / MILLISECONDS_PER_SECOND,
    toSeconds: (clip.startMs + heardToMs - clip.atMs) / MILLISECONDS_PER_SECOND,
  };
}

/** Cuts `buffer` to the part inside both the excerpt and the window; null when nothing is left. */
export function placeClipBuffer(
  clip: ClipAudioSlide,
  buffer: BufferSpan,
  fromMs: number,
): BufferPlacement | null {
  const bufferStartMs = clip.atMs + buffer.startSeconds * MILLISECONDS_PER_SECOND - clip.startMs;
  const bufferEndMs = bufferStartMs + buffer.durationSeconds * MILLISECONDS_PER_SECOND;
  const heardFromMs = Math.max(bufferStartMs, clip.atMs, fromMs);
  const heardToMs = Math.min(bufferEndMs, clip.atMs + clip.endMs - clip.startMs);
  if (heardToMs <= heardFromMs) {
    return null;
  }
  return {
    whenSeconds: (heardFromMs - fromMs) / MILLISECONDS_PER_SECOND,
    offsetSeconds: (heardFromMs - bufferStartMs) / MILLISECONDS_PER_SECOND,
    durationSeconds: (heardToMs - heardFromMs) / MILLISECONDS_PER_SECOND,
  };
}

/** Whether the file gets an audio track: the music, or a clip with sound. */
export function exportHasAudio(slideshow: Slideshow): boolean {
  return slideshow.music !== undefined || clipAudioSlides(slideshow.slides).length > 0;
}
