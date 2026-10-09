import { slideDurationsMs } from "../../compose";
import type { PictureImportState, SkippedFile } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../../player";

/**
 * What step 1 shows: the drop zone, the live progress, the chosen pictures, or a failed import,
 * which takes no more files until it is started over.
 */
export type PicturesPhase = "empty" | "importing" | "done" | "failed";

export function picturesPhase(state: PictureImportState): PicturesPhase {
  if (state.failed) {
    return "failed";
  }
  if (state.busy) {
    return "importing";
  }
  return state.pictures.length > 0 ? "done" : "empty";
}

/** Files accepted but not yet processed: step 1 shows a placeholder tile for each. */
export function pendingPictureCount(state: PictureImportState): number {
  return state.busy ? state.total - state.done : 0;
}

/** "Next" waits until every picture is downscaled (dev-docs/SCOPE.md, interaction rules). */
export function canContinue(state: PictureImportState): boolean {
  return !state.busy && !state.failed && state.pictures.length > 0;
}

/** Whether leaving step 1 would throw away something the user chose. */
export function hasSelection(state: PictureImportState): boolean {
  return state.busy || state.pictures.length > 0;
}

/** The names of the skipped files by what step 1 tells about them. */
export interface SkippedNotices {
  /** Not a picture, or one the browser cannot read. */
  readonly unreadable: readonly string[];
  /** Photos Immich could not deliver. */
  readonly notDownloaded: readonly string[];
}

export function skippedNotices(skipped: readonly SkippedFile[]): SkippedNotices {
  const namesFor = (isNotDownloaded: boolean): string[] =>
    skipped
      .filter((file) => (file.reason === "notDownloaded") === isNotDownloaded)
      .map((file) => file.fileName);
  return { unreadable: namesFor(false), notDownloaded: namesFor(true) };
}

/** First and last capture date of pictures already in capture order. */
export function captureRange(
  pictures: readonly StoredPicture[],
): { readonly from: string; readonly to: string } | null {
  const first = pictures[0];
  const last = pictures.at(-1);
  return first === undefined || last === undefined
    ? null
    : { from: first.capturedAt, to: last.capturedAt };
}

/** The slide durations of a slideshow about to be created: none of its pictures has an own one. */
export function importSlideDurationsMs(
  pictureCount: number,
  musicDurationMs: number | undefined,
  secondsPerPicture: number,
): number[] {
  const pictures = Array.from({ length: pictureCount }, () => ({}));
  return slideDurationsMs(pictures, musicDurationMs, secondsPerPicture);
}

/** Step 2's timing row, by the same rule the slideshow is composed with. */
export function importTiming(
  pictureCount: number,
  musicDurationMs: number | undefined,
  secondsPerPicture: number,
): { readonly perPictureSeconds: number; readonly totalSeconds: number } {
  const totalMs = importSlideDurationsMs(pictureCount, musicDurationMs, secondsPerPicture).reduce(
    (sum, durationMs) => sum + durationMs,
    0,
  );
  return {
    perPictureSeconds: totalMs / pictureCount / MILLISECONDS_PER_SECOND,
    totalSeconds: totalMs / MILLISECONDS_PER_SECOND,
  };
}

/** A short format name for the track card: the file extension, else the type's subtype. */
export function musicFormatLabel(fileName: string, mimeType: string): string {
  const dot = fileName.lastIndexOf(".");
  const extension = dot < 0 ? "" : fileName.slice(dot + 1);
  const subtype = mimeType.split("/")[1] ?? "";
  return (extension || subtype).toUpperCase();
}
