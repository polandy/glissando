import {
  automaticTransition,
  musicExcerpt,
  musicExcerptMs,
  pictureKenBurns,
  pictureTransition,
  slideDurationsMs,
  slideshowTransition,
} from "../../compose";
import type { OwnKenBurns } from "../../library/own-ken-burns";
import {
  MIN_OWN_DURATION_MS,
  type SlideshowTransition,
  type TransitionChoice,
} from "../../library/own-timing";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND, type Size } from "../../player";

/** What an automatic duration follows: the slideshow's seconds per picture, or the music. */
export type DurationBasis =
  | { readonly kind: "seconds-per-picture"; readonly automaticMs: number }
  | {
      readonly kind: "music";
      /** The pictures without an own duration, sharing the rest of the music. */
      readonly automaticCount: number;
      /** What each of them gets; null when there are none. */
      readonly shareMs: number | null;
      /** The own durations use up the music; the automatic pictures get the minimum instead. */
      readonly clamped: boolean;
    };

export interface TransitionView {
  /** The own choice, else the automatic one. */
  readonly choice: TransitionChoice;
  readonly own: boolean;
  /** What the slideshow's default gives the picture's position. */
  readonly automatic: TransitionChoice;
  readonly slideshowTransition: SlideshowTransition;
  /** How long it runs at the end of the picture; 0 for a cut and at the last picture. */
  readonly durationMs: number;
}

/** The picture after this one, as the preview shows it after the transition. */
export interface NextPictureView {
  readonly size: Size;
  readonly motion: OwnKenBurns;
  readonly durationMs: number;
  /** As stored; empty without one. */
  readonly caption: string;
}

/** What the picture editor shows of one picture of a slideshow. */
export interface PictureEditorView {
  readonly id: string;
  /** The position in play order, from 1. */
  readonly number: number;
  readonly count: number;
  readonly fileName: string;
  /** ISO 8601 date-time. */
  readonly capturedAt: string;
  /** The stored picture's size in pixels. */
  readonly size: Size;
  /** The motion the picture plays: its own, or the automatic one for its position. */
  readonly motion: OwnKenBurns;
  readonly ownMotion: boolean;
  /** How long the picture's slide shows: its own duration or the automatic one. */
  readonly durationMs: number;
  readonly ownDuration: boolean;
  readonly durationBasis: DurationBasis;
  readonly transition: TransitionView;
  /** As stored; empty without one. */
  readonly caption: string;
  /** The neighbours in play order; null at the ends. */
  readonly previousId: string | null;
  readonly nextId: string | null;
  readonly next: NextPictureView | null;
}

export function pictureEditorView(stored: StoredSlideshow, pictureId: string): PictureEditorView {
  const { pictures } = stored;
  const index = pictures.findIndex((picture) => picture.id === pictureId);
  const picture = pictures[index];
  if (picture === undefined) {
    throw new Error(`slideshow "${stored.id}" holds no picture "${pictureId}"`);
  }
  const durationsMs = slideDurationsMs(
    pictures,
    musicExcerptMs(stored.music),
    stored.secondsPerPicture,
  );
  // One duration per picture: every index below is in range.
  const durationAt = (at: number) => durationsMs[at] as number;
  const nextPicture = pictures[index + 1];
  const defaultTransition = slideshowTransition(stored);
  const automatic = automaticTransition(index, defaultTransition);
  const transition = pictureTransition(
    index,
    pictures.length,
    picture,
    durationAt(index),
    defaultTransition,
  );
  return {
    id: picture.id,
    number: index + 1,
    count: pictures.length,
    fileName: picture.fileName,
    capturedAt: picture.capturedAt,
    size: sizeOf(picture),
    motion: motionOf(index, picture),
    ownMotion: picture.kenBurns !== undefined,
    durationMs: durationAt(index),
    ownDuration: picture.durationMs !== undefined,
    durationBasis: durationBasis(stored, durationsMs),
    transition: {
      choice: picture.transition ?? automatic,
      own: picture.transition !== undefined,
      automatic,
      slideshowTransition: defaultTransition,
      durationMs: transition?.durationMs ?? 0,
    },
    caption: picture.caption ?? "",
    previousId: pictures[index - 1]?.id ?? null,
    nextId: nextPicture?.id ?? null,
    next:
      nextPicture === undefined
        ? null
        : {
            size: sizeOf(nextPicture),
            motion: motionOf(index + 1, nextPicture),
            durationMs: durationAt(index + 1),
            caption: nextPicture.caption ?? "",
          },
  };
}

function sizeOf(picture: StoredPicture): Size {
  return { width: picture.width, height: picture.height };
}

function motionOf(index: number, picture: StoredPicture): OwnKenBurns {
  const { from, to } = pictureKenBurns(index, picture);
  return { from, to };
}

function durationBasis(stored: StoredSlideshow, durationsMs: readonly number[]): DurationBasis {
  if (stored.music === undefined) {
    return {
      kind: "seconds-per-picture",
      automaticMs: stored.secondsPerPicture * MILLISECONDS_PER_SECOND,
    };
  }
  const automatic = stored.pictures.flatMap((picture, at) =>
    picture.durationMs === undefined ? [durationsMs[at] as number] : [],
  );
  if (automatic.length === 0) {
    return { kind: "music", automaticCount: 0, shareMs: null, clamped: false };
  }
  const ownTotalMs = stored.pictures.reduce((sum, picture) => sum + (picture.durationMs ?? 0), 0);
  const { startMs, endMs } = musicExcerpt(stored.music);
  const idealShareMs = Math.floor((endMs - startMs - ownTotalMs) / automatic.length);
  return {
    kind: "music",
    automaticCount: automatic.length,
    shareMs: automatic[0] ?? null,
    clamped: idealShareMs < MIN_OWN_DURATION_MS,
  };
}
