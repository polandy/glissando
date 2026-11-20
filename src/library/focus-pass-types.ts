import { FOCUS_DETECTOR_VERSION } from "../focus/focus-detector-version";
import type { FocusDetector } from "./focus-detector";
import type { PictureFocus, StoredFocus } from "./picture-focus";
import type { LibraryStore } from "./library-store";

/**
 * One picture's input: a thumbnail to detect on, or a focus already known, which skips the
 * detector (ADR-0041); beside either, the picture as shown, to measure its sharpness on (ADR-0061).
 */
export type DetectionInput =
  | { readonly kind: "detect"; readonly thumbnail: Blob; readonly display?: Blob }
  | { readonly kind: "known"; readonly focus: PictureFocus; readonly display?: Blob };

export interface FocusPassPorts {
  readonly store: Pick<
    LibraryStore,
    "listSlideshows" | "pictureFocus" | "thumbnailBlob" | "putPictureFocus"
  > & {
    /**
     * What to look at for a picture in place of `thumbnailBlob` and `playbackPictureBlob`: the
     * server pass's input is Immich's own faces, or else its downscaled preview (ADR-0041), with
     * the preview as shown beside either (ADR-0061).
     */
    detectionInput?(pictureId: string): Promise<DetectionInput>;
    /**
     * The picture as the player shows it, handed to the detector beside a thumbnail to measure
     * its sharpness on screen (ADR-0061). Omitted, the focus carries no sharpness.
     */
    playbackPictureBlob?(pictureId: string): Promise<Blob>;
  };
  readonly detector: FocusDetector;
  /** A detection failed for one picture: logged, the pass carries on. */
  log(error: unknown): void;
  /** An unexpected error, or the detector gone, ended the pass. */
  reportError(error: unknown): void;
  /**
   * An error from reading a thumbnail or storing a result that means "try again later", not "this
   * picture failed": e.g. the server is unreachable. The pass ends quietly, without `reportError`,
   * and resumes where it left off on the next `start()` or `lookAgain()` (ADR-0041).
   */
  pausesOn?(error: unknown): boolean;
  /**
   * A slideshow's own error, reading its stored focus during a scan, means it is gone, e.g.
   * deleted on another device between listing it and reading its focus: that one slideshow is
   * skipped, the scan carrying on with the rest, the way a picture's `MediaNotFoundError` is
   * skipped in `#lookAt`.
   */
  isGone?(error: unknown): boolean;
  /**
   * An error from reading one picture's detection input that means "this picture's input cannot
   * be decoded", e.g. an undecodable server preview: that picture is logged as failed, like a
   * failed detection, and the pass carries on with the next. Any other input error ends the pass.
   */
  failsPictureOn?(error: unknown): boolean;
}

/** How far the pass is with one slideshow's pictures. */
export interface SlideshowSearch {
  readonly done: number;
  /** The pictures it had no current focus for when the pass took it up. */
  readonly total: number;
  /** Every one of them already had a stored focus (outdated, or asked again): "looking again". */
  readonly again: boolean;
  /** This slideshow's pictures still in `FocusPassState.failed`; outlives the pass taking it up. */
  readonly failed: number;
}

export interface FocusPassState {
  readonly running: boolean;
  /** The pass ended on a `pausesOn` error, pictures left to look at; `start`/`lookAgain` resumes. */
  readonly paused: boolean;
  /** Each slideshow with pictures still to look at, by slideshow id. */
  readonly slideshows: ReadonlyMap<string, SlideshowSearch>;
  /** The pictures the pass will still look at, the one in flight included. */
  readonly searching: ReadonlySet<string>;
  /** Every focus the pass stored since the app opened, by picture id. */
  readonly found: ReadonlyMap<string, PictureFocus>;
  /** Pictures whose detection failed this session; a later successful look removes them. */
  readonly failed: ReadonlySet<string>;
}

/** The detector failed on one picture; it is looked at again on the next pass. */
export class FocusDetectionFailedError extends Error {
  constructor(
    readonly pictureId: string,
    cause: unknown,
  ) {
    super(`finding the focus of picture "${pictureId}" failed`, { cause });
    this.name = "FocusDetectionFailedError";
  }
}

export const IDLE: FocusPassState = {
  running: false,
  paused: false,
  slideshows: new Map(),
  searching: new Set(),
  found: new Map(),
  failed: new Set(),
};

/** No record, or one an older detector found: looked at again (ADR-0041). */
export function isOutdated(record: StoredFocus | undefined): boolean {
  return record === undefined || record.detector < FOCUS_DETECTOR_VERSION;
}

/** Immich's faces gave this focus and nothing measured its sharpness on screen yet (ADR-0061). */
export function isUnmeasured(record: StoredFocus | undefined): boolean {
  return (
    record !== undefined &&
    record.focus.kind === "subject" &&
    record.focus.foundBy === "immich-faces" &&
    record.focus.sharpness === undefined
  );
}
