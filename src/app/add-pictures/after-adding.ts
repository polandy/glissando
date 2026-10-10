import { slideDurationsMs } from "../../compose";
import { musicExcerptMs } from "../../compose/music-excerpt";
import { addPictures } from "../../library/slideshow-edits";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../../player";

export interface BeforeAfter {
  readonly before: number;
  readonly after: number;
}

/** The line below the facts: how the new pictures are timed. */
export type AfterAddingNote =
  | { readonly kind: "noMusic"; readonly secondsPerPicture: number }
  | { readonly kind: "sharesMusic" }
  /** The share fell below the floor, so the slideshow outlasts the music's excerpt. */
  | { readonly kind: "musicTooShort"; readonly musicSeconds: number };

/** The add screen's "After adding" box. */
export interface AfterAdding {
  readonly pictures: BeforeAfter;
  readonly durationSeconds: BeforeAfter;
  /** The automatic pictures' share of the music; null without music or nothing shared before. */
  readonly perPictureSeconds: BeforeAfter | null;
  readonly note: AfterAddingNote;
}

/** The slideshow before and after `added` join it, by the composition rules (ADR-0008). */
export function afterAdding(
  slideshow: StoredSlideshow,
  added: readonly StoredPicture[],
): AfterAdding {
  const excerptMs = musicExcerptMs(slideshow.music);
  const before = timing(slideshow, excerptMs);
  const after = timing(addPictures(slideshow, added), excerptMs);
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
    note: noteFor(slideshow, excerptMs, after.totalMs),
  };
}

function noteFor(
  slideshow: StoredSlideshow,
  excerptMs: number | undefined,
  totalMs: number,
): AfterAddingNote {
  if (excerptMs === undefined) {
    return { kind: "noMusic", secondsPerPicture: slideshow.secondsPerPicture };
  }
  return totalMs > excerptMs
    ? { kind: "musicTooShort", musicSeconds: excerptMs / MILLISECONDS_PER_SECOND }
    : { kind: "sharesMusic" };
}

/** The total and the average automatic picture's duration, null when every picture has its own. */
function timing(
  slideshow: StoredSlideshow,
  excerptMs: number | undefined,
): { readonly totalMs: number; readonly shareMs: number | null } {
  const durationsMs = slideDurationsMs(slideshow.pictures, excerptMs, slideshow.secondsPerPicture);
  const automaticMs = durationsMs.filter(
    (_, index) => slideshow.pictures[index]?.durationMs === undefined,
  );
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  return {
    totalMs: sum(durationsMs),
    shareMs: automaticMs.length === 0 ? null : sum(automaticMs) / automaticMs.length,
  };
}
