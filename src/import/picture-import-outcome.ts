import { FOCUS_DETECTOR_VERSION } from "../focus/focus-detector-version";
import { isSamePicture, type PictureIdentity } from "../library/picture-identity";
import { pictureColours, type RgbPixel } from "../library/picture-colours";
import { MAX_VIDEO_EXCERPT_MS, type StoredVideo } from "../library/own-video";
import type { LibraryStore, StoredPicture } from "../library/stored-slideshow";
import type { DuplicateReason, SkipReason } from "./picture-import-types";
import {
  PictureNotDownloadedError,
  type PictureSource,
  type ReadPicture,
  type ReadVideo,
} from "./picture-source";
import { UnreadablePictureError } from "./unreadable-picture";
import { VideoRefusedError } from "./video-refusal";

const QUOTA_EXCEEDED = "QuotaExceededError";

export interface OutcomePorts {
  readonly store: Pick<LibraryStore, "putPicture" | "putPictureFocus" | "putVideo">;
  /** The stored display rendition's pixels, sampled for `pictureColours` (ADR-0033). */
  pixels(blob: Blob): Promise<readonly RgbPixel[]>;
  newId(): string;
  /** Told why a picture was skipped as unreadable or undecodable; absent: no one is told. */
  log?(error: unknown): void;
}

export interface Queued {
  readonly source: PictureSource;
  /** False for a duplicate the user takes in after all. */
  readonly skipDuplicate: boolean;
  /** The pick this file belongs to; absent for a duplicate taken in after all (no pick of its own). */
  readonly pickId?: string;
}

export type Outcome =
  | { readonly kind: "stored"; readonly picture: StoredPicture; readonly thumbnail: Blob }
  | { readonly kind: "skipped"; readonly reason: SkipReason }
  | { readonly kind: "storageFull" };

/** Why `identity` is a duplicate of one of `known` or of `chosen` already in this import; none otherwise. */
export function duplicateReason(
  identity: PictureIdentity,
  known: readonly PictureIdentity[],
  chosen: readonly PictureIdentity[],
): DuplicateReason | null {
  const matches = (picture: PictureIdentity) => isSamePicture(picture, identity);
  if (known.some(matches)) {
    return "alreadyIn";
  }
  return chosen.some(matches) ? "chosenTwice" : null;
}

/** Identifies, decodes and stores one queued picture, or reports why it was skipped instead. */
export async function importOne(
  { source, skipDuplicate }: Queued,
  ports: OutcomePorts,
  duplicateReasonFor: (identity: PictureIdentity) => DuplicateReason | null,
): Promise<Outcome> {
  let identity: PictureIdentity;
  let read: ReadPicture;
  try {
    identity = await source.identify();
    const duplicate = skipDuplicate ? duplicateReasonFor(identity) : null;
    if (duplicate !== null) {
      return { kind: "skipped", reason: duplicate };
    }
    read = await source.read();
  } catch (error) {
    if (error instanceof UnreadablePictureError) {
      ports.log?.(error);
      return { kind: "skipped", reason: error.stage === "read" ? "unreadable" : "undecodable" };
    }
    if (error instanceof VideoRefusedError) {
      return { kind: "skipped", reason: error.reason };
    }
    if (error instanceof PictureNotDownloadedError) {
      return { kind: "skipped", reason: "notDownloaded" };
    }
    throw error;
  }
  const { decoded, focus, video } = read;
  const id = ports.newId();
  const storedVideo = video === undefined ? undefined : wholeClip(ports.newId(), video);
  try {
    if (video !== undefined && storedVideo !== undefined) {
      await ports.store.putVideo(storedVideo.mediaId, video.blob);
    }
    await ports.store.putPicture(id, {
      display: decoded.display,
      thumbnail: decoded.thumbnail,
    });
    if (focus !== null) {
      await ports.store.putPictureFocus(id, { focus, detector: FOCUS_DETECTOR_VERSION });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === QUOTA_EXCEEDED) {
      return { kind: "storageFull" };
    }
    throw error;
  }
  const { width, height } = decoded;
  const { fileName, capturedAt, immichAssetId, fileBytes } = identity;
  const origin = {
    ...(immichAssetId === undefined ? {} : { immichAssetId }),
    ...(fileBytes === undefined ? {} : { fileBytes }),
  };
  const colours = pictureColours(await ports.pixels(decoded.display));
  return {
    kind: "stored",
    picture: {
      id,
      capturedAt,
      width,
      height,
      fileName,
      colours,
      ...origin,
      ...(storedVideo === undefined ? {} : { video: storedVideo }),
    },
    thumbnail: decoded.thumbnail,
  };
}

/** A clip's first stored form: the whole clip, up to the longest excerpt, from its start. */
function wholeClip(mediaId: string, { sourceMs }: ReadVideo): StoredVideo {
  return { mediaId, sourceMs, startMs: 0, endMs: Math.min(sourceMs, MAX_VIDEO_EXCERPT_MS) };
}
