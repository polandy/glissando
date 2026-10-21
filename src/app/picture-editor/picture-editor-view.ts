import {
  automaticTransition,
  beatTransitionDurationMs,
  filledMusicMs,
  pairKenBurns,
  pictureKenBurns,
  pictureLayoutSummaries,
  type PictureLayoutSummary,
  playlistBeatsMs,
  pictureTransition,
  slideDurationsMs,
  slideOfPicture,
  slideshowTransition,
  slideUnits,
  timedUnit,
  type SlideUnit,
  type SongBeats,
} from "../../compose";
import type { OwnKenBurns } from "../../library/own-ken-burns";
import type { SlideshowTransition, TransitionChoice } from "../../library/own-timing";
import type { PortraitPictures } from "../../library/portrait-pictures";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import type { Size } from "../../player";
import {
  focusStatus,
  pictureFocusDisplay,
  type PictureFocusStatus,
  type PicturesFocus,
} from "../focus/pictures-focus";
import { durationBasis, type DurationBasis } from "./picture-editor-duration-basis";
import { focusLineView, type FocusLineView } from "./focus-indication";

export interface TransitionView {
  /** The own choice, else the automatic one. */
  readonly choice: TransitionChoice;
  readonly own: boolean;
  /** What the slideshow's default gives the picture's position. */
  readonly automatic: TransitionChoice;
  readonly slideshowTransition: SlideshowTransition;
  /**
   * How long it runs at the end of the picture's slide; 0 for a cut and at the last slide. Both
   * halves of a pair show the slide's one transition (ADR-0028).
   */
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

/**
 * The slide after this picture's, as the preview shows it after the transition: its first
 * picture, so for either half of a pair the picture after the pair (ADR-0028).
 */
export interface NextPictureView {
  /** Its position in play order, from 1. */
  readonly number: number;
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
  /** The focus line's state and action: the 10-state search status, own motion included. */
  readonly focusLine: FocusLineView;
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
  /** Only the server or Immich pauses the pass (ADR-0041); says so instead of just "waiting". */
  passPaused = false,
): PictureEditorView {
  const { pictures } = stored;
  const index = pictures.findIndex((picture) => picture.id === pictureId);
  const picture = pictures[index];
  if (picture === undefined) {
    throw new Error(`slideshow "${stored.id}" holds no picture "${pictureId}"`);
  }
  const beatsMs = playlistBeatsMs(stored, beats);
  // The preview plays the picture's slide as composed (ADR-0028): a pair is one slide, timed
  // once, with one transition and the pair's motion.
  const units = slideUnits(pictures, stored.portraitPictures);
  const durationsMs = slideDurationsMs(
    units.map((unit) => timedUnit(pictures, unit)),
    filledMusicMs(stored),
    stored.secondsPerPicture,
    beatsMs,
  );
  const slideIndex = slideOfPicture(units, index);
  // One duration per slide unit; every slide index below is in range.
  const durationAt = (slide: number) => durationsMs[slide] as number;
  const nextUnit = units[slideIndex + 1];
  const defaultTransition = slideshowTransition(stored);
  const automatic = automaticTransition(slideIndex, defaultTransition);
  const transition = pictureTransition(
    slideIndex,
    units.length,
    picture,
    durationAt(slideIndex),
    defaultTransition,
  );
  return {
    id: picture.id,
    number: index + 1,
    count: pictures.length,
    fileName: picture.fileName,
    capturedAt: picture.capturedAt,
    size: sizeOf(picture),
    motion: motionOf(units, slideIndex, index, pictures, focus),
    ownMotion: picture.kenBurns !== undefined,
    focus: focusStatus(focus, picture.id),
    focusLine: focusLineView(
      pictureFocusDisplay(focus, picture.id, picture.kenBurns !== undefined, passPaused),
      focus.found.get(picture.id),
    ),
    durationMs: durationAt(slideIndex),
    ownDuration: picture.durationMs !== undefined,
    durationBasis: durationBasis(stored, units, durationsMs),
    transition: {
      choice: picture.transition ?? automatic,
      own: picture.transition !== undefined,
      automatic,
      slideshowTransition: defaultTransition,
      durationMs:
        transition === undefined
          ? 0
          : beatTransitionDurationMs(
              sum(durationsMs.slice(0, slideIndex + 1)),
              transition.durationMs,
              beatsMs ?? [],
            ),
    },
    caption: picture.caption ?? "",
    previousId: pictures[index - 1]?.id ?? null,
    nextId: pictures[index + 1]?.id ?? null,
    next:
      nextUnit === undefined
        ? null
        : nextSlideView(units, slideIndex + 1, pictures, focus, durationAt(slideIndex + 1)),
    layout: layoutOf(picture, index, pictures, stored.portraitPictures),
  };
}

function nextSlideView(
  units: readonly SlideUnit[],
  slideIndex: number,
  pictures: readonly StoredPicture[],
  focus: PicturesFocus,
  durationMs: number,
): NextPictureView {
  const firstIndex = (units[slideIndex] as SlideUnit).pictureIndices[0];
  const first = pictures[firstIndex] as StoredPicture;
  return {
    number: firstIndex + 1,
    size: sizeOf(first),
    motion: motionOf(units, slideIndex, firstIndex, pictures, focus),
    durationMs,
    caption: first.caption ?? "",
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

/** The motion the picture plays on its slide: a pair's half pans no further sideways. */
function motionOf(
  units: readonly SlideUnit[],
  slideIndex: number,
  pictureIndex: number,
  pictures: readonly StoredPicture[],
  focus: PicturesFocus,
): OwnKenBurns {
  const { pictureIndices } = units[slideIndex] as SlideUnit;
  const picture = pictures[pictureIndex] as StoredPicture;
  if (pictureIndices.length === 1) {
    const { from, to } = pictureKenBurns(slideIndex, picture, focus.found.get(picture.id));
    return { from, to };
  }
  const [firstIndex, secondIndex] = pictureIndices;
  const first = pictures[firstIndex] as StoredPicture;
  const second = pictures[secondIndex] as StoredPicture;
  const pair = pairKenBurns(
    slideIndex,
    first,
    focus.found.get(first.id),
    second,
    focus.found.get(second.id),
  );
  const { from, to } = pictureIndex === firstIndex ? pair.first : pair.second;
  return { from, to };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
