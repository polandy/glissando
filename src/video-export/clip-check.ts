import { isGroundSlide, type Slideshow } from "../player";

/** A video slide's clip as the export needs to decode it. */
export interface ClipToDecode {
  readonly src: string;
  /** Whether its sound is mixed in (volume above 0). */
  readonly withSound: boolean;
}

/** The video slides' clips in show order. */
export function clipsToDecode(slideshow: Slideshow): readonly ClipToDecode[] {
  return slideshow.slides.flatMap((slide) =>
    !isGroundSlide(slide) && slide.video !== undefined
      ? [{ src: slide.video.src, withSound: slide.video.volume > 0 }]
      : [],
  );
}

/**
 * The 1-based number of the first clip `canDecode` refuses, null when all can be exported. A clip
 * is asked in show order, so the number is the one the user sees counting their clips.
 */
export async function firstUndecodableClip(
  clips: readonly ClipToDecode[],
  canDecode: (clip: ClipToDecode) => Promise<boolean>,
): Promise<number | null> {
  for (const [index, clip] of clips.entries()) {
    if (!(await canDecode(clip))) {
      return index + 1;
    }
  }
  return null;
}
