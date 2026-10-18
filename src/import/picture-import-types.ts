/**
 * Types shared between `picture-import.ts` and `picture-import-outcome.ts`, kept apart so neither
 * module imports the other just for its types.
 */

import type { StoredPicture } from "../library/stored-slideshow";
import type { OutcomePorts } from "./picture-import-outcome";
import type { PictureIdentity } from "../library/picture-identity";
import type { VideoRefusal } from "./video-refusal";

/** Why a picture was skipped as a duplicate: one of the known ones, or one this import took in. */
export type DuplicateReason = "alreadyIn" | "chosenTwice";

/**
 * "unreadable": the bytes could not be read; "undecodable": they could not be decoded into pixels;
 * a video is refused as "videoUnplayable", "videoTooLarge" or "videoTooShort".
 */
export type SkipReason =
  "unsupported" | "unreadable" | "undecodable" | "notDownloaded" | VideoRefusal | DuplicateReason;

export interface SkippedFile {
  readonly fileName: string;
  readonly reason: SkipReason;
}

/** A picture just stored, with the thumbnail it was stored with. */
export interface StoredWithThumbnail {
  readonly picture: StoredPicture;
  readonly thumbnail: Blob;
  /** A duplicate the user took in after all. */
  readonly takenInAnyway: boolean;
}

export interface PictureImportPorts extends OutcomePorts {
  /** Pictures already there now, such as the slideshow's when adding to it; absent: none. */
  known?(): readonly PictureIdentity[];
  /** Told of each picture this import stores, before it is listed; absent: no one is told. */
  stored?(stored: StoredWithThumbnail): void;
}

/** The import stopped on an unexpected error, its `cause`; the state reports it as failed. */
export class PictureImportFailedError extends Error {
  constructor(cause: unknown) {
    super("the picture import failed on an unexpected error", { cause });
    this.name = "PictureImportFailedError";
  }
}
