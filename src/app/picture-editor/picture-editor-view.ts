import {
  automaticTransition,
  beatTransitionDurationMs,
  filledMusicMs,
  pictureDurationsMs,
  pictureKenBurns,
  pictureLayoutSummaries,
  type PictureLayoutSummary,
  playlistBeatsMs,
  playlistMs,
  pictureTransition,
  slideshowTransition,
  type SongBeats,
} from "../../compose";
import type { OwnKenBurns } from "../../library/own-ken-burns";
import {
  MIN_OWN_DURATION_MS,
  type SlideshowTransition,
  type TransitionChoice,
} from "../../library/own-timing";
import type { PortraitPictures } from "../../library/portrait-pictures";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND, type Size } from "../../player";
import { focusStatus, type PictureFocusStatus, type PicturesFocus } from "../focus/pictures-focus";

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

/** A picture's layout (ADR-0028), for the picture editor's "Always alone" section. */
export interface PictureLayoutView {
  /** The switch's own state: never composed into a pair. */
  readonly alone: boolean;
  /** The pair partner's number (1-based), when the picture shares a slide with it. */
  readonly pairedWithNumber: number | null;
  /** Shown whole over a blurred copy of itself because a wide screen would crop too much. */
  readonly blurredFill: boolean;
  /** The slideshow's setting when it is not automatic, where the switch has no effect. */
  readonly settingOverride: PortraitPictures | null;
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
  /** What the automatic motion aims at, or that the search for it is still to come. */
  readonly focus: PictureFocusStatus;
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
  readonly layout: PictureLayoutView;
}

/**
 * `focus`: the automatic motions aim at it; `beats`: each song's beats found so far, which the
 * automatic changes land on (ADR-0021, ADR-0023). So the preview plays what the player will.
 */
export function pictureEditorView(
  stored: StoredSlideshow,
  pictureId: string,
  focus: PicturesFocus,
  beats: SongBeats,
): PictureEditorView {
  const { pictures } = stored;
  const index = pictures.findIndex((picture) => picture.id === pictureId);
  const picture = pictures[index];
  if (picture === undefined) {
    throw new Error(`slideshow "${stored.id}" holds no picture "${pictureId}"`);
  }
  const beatsMs = playlistBeatsMs(stored, beats);
  const durationsMs = pictureDurationsMs(
    pictures,
    stored.portraitPictures,
    filledMusicMs(stored),
    stored.secondsPerPicture,
    beatsMs,
  );
  // One duration per picture, a paired picture showing its pair's (ADR-0028); every index below
  // is in range.
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
    motion: motionOf(index, picture, focus),
    ownMotion: picture.kenBurns !== undefined,
    focus: focusStatus(focus, picture.id),
    durationMs: durationAt(index),
    ownDuration: picture.durationMs !== undefined,
    durationBasis: durationBasis(stored, durationsMs),
    transition: {
      choice: picture.transition ?? automatic,
      own: picture.transition !== undefined,
      automatic,
      slideshowTransition: defaultTransition,
      durationMs:
        transition === undefined
          ? 0
          : beatTransitionDurationMs(
              sum(durationsMs.slice(0, index + 1)),
              transition.durationMs,
              beatsMs ?? [],
            ),
    },
    caption: picture.caption ?? "",
    previousId: pictures[index - 1]?.id ?? null,
    nextId: nextPicture?.id ?? null,
    next:
      nextPicture === undefined
        ? null
        : {
            size: sizeOf(nextPicture),
            motion: motionOf(index + 1, nextPicture, focus),
            durationMs: durationAt(index + 1),
            caption: nextPicture.caption ?? "",
          },
    layout: layoutOf(picture, index, pictures, stored.portraitPictures),
  };
}

function layoutOf(
  picture: StoredPicture,
  index: number,
  pictures: readonly StoredPicture[],
  portraitPictures: PortraitPictures | undefined,
): PictureLayoutView {
  // One summary per picture (`pictureLayoutSummaries`'s contract); `index` is always in range.
  const summary = pictureLayoutSummaries(pictures, portraitPictures)[index] as PictureLayoutSummary;
  return {
    alone: picture.alone === true,
    pairedWithNumber: summary.pairedWithNumber,
    blurredFill: summary.blurredFill,
    settingOverride: portraitPictures ?? null,
  };
}

function sizeOf(picture: StoredPicture): Size {
  return { width: picture.width, height: picture.height };
}

function motionOf(index: number, picture: StoredPicture, focus: PicturesFocus): OwnKenBurns {
  const { from, to } = pictureKenBurns(index, picture, focus.found.get(picture.id));
  return { from, to };
}

function durationBasis(stored: StoredSlideshow, durationsMs: readonly number[]): DurationBasis {
  const musicMs = playlistMs(stored);
  if (musicMs === undefined) {
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
  const idealShareMs = Math.floor((musicMs - ownTotalMs) / automatic.length);
  return {
    kind: "music",
    automaticCount: automatic.length,
    shareMs: automatic[0] ?? null,
    clamped: idealShareMs < MIN_OWN_DURATION_MS,
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
