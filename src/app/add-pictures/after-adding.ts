import { slideDurationsMs } from "../../compose";
import { musicExcerptMs } from "../../compose/music-excerpt";
import type { AddedPlacement } from "../../library/added-placement";
import { addPictures } from "../../library/slideshow-edits";
import {
  MIN_SECONDS_PER_PICTURE,
  type StoredPicture,
  type StoredSlideshow,
} from "../../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../../player";

export interface BeforeAfter {
  readonly before: number;
  readonly after: number;
}

/** The line below the facts: how the new pictures are timed. */
export type AfterAddingNote =
  | { readonly kind: "noMusic"; readonly secondsPerPicture: number }
  | { readonly kind: "sharesMusic" }
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
  /** The automatic pictures' share of the music; null without music or nothing shared before. */
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
  const excerptMs = musicExcerptMs(slideshow.music);
  const withAdded = addPictures(slideshow, added, placement);
  const before = timing(slideshow, excerptMs);
  const after = timing(withAdded, excerptMs);
  const toSeconds = (ms: number) => ms / MILLISECONDS_PER_SECOND;
  return {
    pictures: {
      before: slideshow.pictures.length,
      after: slideshow.pictures.length + added.length,
    },
    durationSeconds: { before: toSeconds(before.totalMs), after: toSeconds(after.totalMs) },
    perPictureSeconds:
      excerptMs === undefined || before.shareMs === null || after.shareMs === null
        ? null
        : { before: toSeconds(before.shareMs), after: toSeconds(after.shareMs) },
    note: noteFor(slideshow, excerptMs, after.shareAtFloor),
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
  excerptMs: number | undefined,
  shareAtFloor: boolean,
): AfterAddingNote {
  if (excerptMs === undefined) {
    return { kind: "noMusic", secondsPerPicture: slideshow.secondsPerPicture };
  }
  return shareAtFloor
    ? { kind: "musicTooShort", musicSeconds: excerptMs / MILLISECONDS_PER_SECOND }
    : { kind: "sharesMusic" };
}

/**
 * The total and the average automatic picture's duration, null when every picture has its own;
 * whether the music's share for the automatic pictures fell below the floor they are kept at.
 */
function timing(
  slideshow: StoredSlideshow,
  excerptMs: number | undefined,
): { readonly totalMs: number; readonly shareMs: number | null; readonly shareAtFloor: boolean } {
  const durationsMs = slideDurationsMs(slideshow.pictures, excerptMs, slideshow.secondsPerPicture);
  const automaticMs = durationsMs.filter(
    (_, index) => slideshow.pictures[index]?.durationMs === undefined,
  );
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  const ownMs = sum(durationsMs) - sum(automaticMs);
  const shareAtFloor =
    excerptMs !== undefined &&
    automaticMs.length > 0 &&
    (excerptMs - ownMs) / automaticMs.length < MIN_SECONDS_PER_PICTURE * MILLISECONDS_PER_SECOND;
  return {
    totalMs: sum(durationsMs),
    shareMs: automaticMs.length === 0 ? null : sum(automaticMs) / automaticMs.length,
    shareAtFloor,
  };
}
