import { slideDurationsMs, slideUnits, timedUnit } from "../../compose";
import { picturesFillMs, targetSecondsPerPicture } from "../../compose/filled-length";
import { playlistMs } from "../../compose/playlist";
import type { AddedPlacement } from "../../library/added-placement";
import { addPictures } from "../../library/slideshow-edits";
import {
  MIN_SECONDS_PER_PICTURE,
  type StoredPicture,
  type StoredSlideshow,
} from "../../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../../player";

/** A single slide's weight; a composed pair weighs `PAIR_WEIGHT`. */
const SINGLE_WEIGHT = 1;

export interface BeforeAfter {
  readonly before: number;
  readonly after: number;
}

/** The line below the facts: how the new pictures are timed. */
export type AfterAddingNote =
  | { readonly kind: "ownSeconds"; readonly secondsPerPicture: number }
  | { readonly kind: "sharesMusic" }
  /** The pictures shrink to fit a shorter playlist instead of outlasting it (ADR-0047). */
  | { readonly kind: "fitted"; readonly shareSeconds: number }
  /** The automatic share fell below the floor, so the slideshow outlasts the music's excerpt. */
  | { readonly kind: "musicTooShort"; readonly musicSeconds: number };

/** A run of new pictures in the play order, after the picture numbered so before adding (0: first). */
export interface AddedSpot {
  readonly afterNumber: number;
  readonly count: number;
}

/** Where the new pictures go in an own order: the play order after adding and its new runs. */
export interface PlacementPreview {
  readonly order: readonly { readonly id: string; readonly isNew: boolean }[];
  readonly spots: readonly AddedSpot[];
}

/** The add screen's "After adding" box. */
export interface AfterAdding {
  readonly pictures: BeforeAfter;
  readonly durationSeconds: BeforeAfter;
  /**
   * A single automatic slide's share of the music, filled or fitted (a pair gets `PAIR_WEIGHT`
   * times it); null when the pictures neither fill nor fit it.
   */
  readonly perPictureSeconds: BeforeAfter | null;
  readonly note: AfterAddingNote;
  /** Null for a slideshow sorted by capture date, where the new pictures take their places. */
  readonly placement: PlacementPreview | null;
}

/** The slideshow before and after `added` join it, by the composition rules (ADR-0008). */
export function afterAdding(
  slideshow: StoredSlideshow,
  added: readonly StoredPicture[],
  placement: AddedPlacement,
): AfterAdding {
  const withAdded = addPictures(slideshow, added, placement);
  const playlistLengthMs = playlistMs(slideshow);
  const target = targetSecondsPerPicture(slideshow.pictureLength, slideshow.secondsPerPicture);
  const before = timing(slideshow, playlistLengthMs, target);
  const after = timing(withAdded, playlistLengthMs, target);
  const toSeconds = (ms: number) => ms / MILLISECONDS_PER_SECOND;
  // The share is worth showing whenever either side actually fills or fits the music
  // (ADR-0047); otherwise every automatic slide just stands at its plain target length.
  const sharing = before.filledMs !== undefined || after.filledMs !== undefined;
  return {
    pictures: {
      before: slideshow.pictures.length,
      after: slideshow.pictures.length + added.length,
    },
    durationSeconds: { before: toSeconds(before.totalMs), after: toSeconds(after.totalMs) },
    perPictureSeconds:
      !sharing || before.shareMs === null || after.shareMs === null
        ? null
        : { before: toSeconds(before.shareMs), after: toSeconds(after.shareMs) },
    note: noteFor(slideshow, target, after),
    placement: slideshow.ownOrder ? placementPreview(slideshow, withAdded) : null,
  };
}

function placementPreview(
  slideshow: StoredSlideshow,
  withAdded: StoredSlideshow,
): PlacementPreview {
  const known = new Set(slideshow.pictures.map(({ id }) => id));
  const order = withAdded.pictures.map(({ id }) => ({ id, isNew: !known.has(id) }));
  const spots: AddedSpot[] = [];
  let knownSoFar = 0;
  for (const { isNew } of order) {
    const last = spots.at(-1);
    if (!isNew) knownSoFar++;
    else if (last?.afterNumber === knownSoFar)
      spots[spots.length - 1] = { ...last, count: last.count + 1 };
    else spots.push({ afterNumber: knownSoFar, count: 1 });
  }
  return { order, spots };
}

function noteFor(
  slideshow: StoredSlideshow,
  target: number | undefined,
  after: Timing,
): AfterAddingNote {
  if (target !== undefined) {
    // Own seconds or a mood: picturesFillMs already decided whether the pictures fit a
    // shorter playlist or keep target, ending in silence (ADR-0047).
    return after.filledMs === undefined || after.shareMs === null
      ? { kind: "ownSeconds", secondsPerPicture: target }
      : { kind: "fitted", shareSeconds: after.shareMs / MILLISECONDS_PER_SECOND };
  }
  if (after.filledMs === undefined) {
    return { kind: "ownSeconds", secondsPerPicture: slideshow.secondsPerPicture };
  }
  return after.shareAtFloor
    ? { kind: "musicTooShort", musicSeconds: after.filledMs / MILLISECONDS_PER_SECOND }
    : { kind: "sharesMusic" };
}

interface Timing {
  readonly totalMs: number;
  readonly shareMs: number | null;
  readonly filledMs: number | undefined;
  /** Fill mode only: the automatic share fell below the floor they are kept at regardless. */
  readonly shareAtFloor: boolean;
}

/**
 * The total and a single automatic slide's share (a pair weighs `PAIR_WEIGHT`), null when every
 * slide has its own duration; the length the pictures fill or fit, and whether a fill-mode share
 * fell below the floor the automatic slides are kept at regardless (`picturesFillMs` already
 * settles the own-seconds/mood case, so `shareAtFloor` does not apply there).
 */
function timing(
  slideshow: StoredSlideshow,
  playlistLengthMs: number | undefined,
  target: number | undefined,
): Timing {
  const timed = slideUnits(slideshow.pictures, slideshow.portraitPictures).map((unit) =>
    timedUnit(slideshow.pictures, unit),
  );
  const filledMs = picturesFillMs(playlistLengthMs, timed, target, slideshow.repeatMusic);
  const durationsMs = slideDurationsMs(timed, filledMs, target ?? slideshow.secondsPerPicture);
  const automatic = timed.flatMap((slide, index) =>
    slide.durationMs === undefined
      ? [{ weight: slide.weight ?? SINGLE_WEIGHT, durationMs: durationsMs[index] as number }]
      : [],
  );
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  const totalMs = sum(durationsMs);
  const automaticMs = sum(automatic.map(({ durationMs }) => durationMs));
  const automaticWeight = sum(automatic.map(({ weight }) => weight));
  const lightestWeight =
    automatic.length === 0 ? 0 : Math.min(...automatic.map(({ weight }) => weight));
  const shareAtFloor =
    filledMs !== undefined &&
    automatic.length > 0 &&
    ((filledMs - (totalMs - automaticMs)) * lightestWeight) / automaticWeight <
      MIN_SECONDS_PER_PICTURE * MILLISECONDS_PER_SECOND;
  return {
    totalMs,
    shareMs: automatic.length === 0 ? null : automaticMs / automaticWeight,
    filledMs,
    shareAtFloor,
  };
}
