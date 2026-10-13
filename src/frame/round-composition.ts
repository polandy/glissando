import { autoKenBurns } from "../compose/auto-ken-burns";
import { autoTransitionEffect, transitionDurationMs } from "../compose/auto-transition";
import { SLIDESHOW_FORMAT_VERSION, type Slide, type Slideshow } from "../player/slideshow";

/** The picture metadata a round needs; a loose subset of `ImmichPhoto` (src/immich). */
export interface RoundPicture {
  readonly id: string;
  readonly takenAt: string;
  /** Null while Immich has not read it yet: the automatic framing then treats it as square. */
  readonly size: { readonly width: number; readonly height: number } | null;
}

/** A picture Immich has no size for yet; the framing then swings around the middle. */
const UNKNOWN_SIZE = { width: 1, height: 1 };

/**
 * Composes one round's finite `Slideshow` (`dev-docs/app/FRAME.md`, ADR-0030): the automatic Ken
 * Burns and transitions a normal slideshow gets, `intervalMs` per picture, no music, no caption
 * baked into the slide (the frame draws the album name and date as its own overlay).
 */
export function composeRound(
  title: string,
  pictureIds: readonly string[],
  picturesById: ReadonlyMap<string, RoundPicture>,
  intervalMs: number,
  pictureSrc: (id: string) => string,
): Slideshow {
  const slides: Slide[] = pictureIds.map((id, index) => {
    const picture = picturesById.get(id);
    if (picture === undefined) {
      throw new Error(`round composition: picture "${id}" is not in the album's own list`);
    }
    const size = picture.size ?? UNKNOWN_SIZE;
    const isLast = index === pictureIds.length - 1;
    return {
      image: { src: pictureSrc(id), capturedAt: picture.takenAt },
      durationMs: intervalMs,
      kenBurns: autoKenBurns(index, size),
      ...(isLast
        ? {}
        : {
            transitionToNext: {
              effect: autoTransitionEffect(index),
              durationMs: transitionDurationMs(intervalMs),
            },
          }),
    };
  });
  return { formatVersion: SLIDESHOW_FORMAT_VERSION, title, slides };
}
