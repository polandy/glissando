import { isSamePicture, type PictureIdentity } from "../library/picture-identity";
import type { LibraryStore, StoredPicture } from "../library/stored-slideshow";
import type { DuplicateReason, SkipReason } from "./picture-import";
import { PictureNotDownloadedError, type PictureSource, type ReadPicture } from "./picture-source";
import { UnreadablePictureError } from "./unreadable-picture";

const QUOTA_EXCEEDED = "QuotaExceededError";

export interface OutcomePorts {
  readonly store: Pick<LibraryStore, "putPicture" | "putPictureFocus">;
  newId(): string;
}

export interface Queued {
  readonly source: PictureSource;
  /** False for a duplicate the user takes in after all. */
  readonly skipDuplicate: boolean;
}

export type Outcome =
  | { readonly kind: "stored"; readonly picture: StoredPicture }
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
      return { kind: "skipped", reason: "unreadable" };
    }
    if (error instanceof PictureNotDownloadedError) {
      return { kind: "skipped", reason: "notDownloaded" };
    }
    throw error;
  }
  const { decoded, focus } = read;
  const id = ports.newId();
  try {
    await ports.store.putPicture(id, {
      display: decoded.display,
      thumbnail: decoded.thumbnail,
    });
    if (focus !== null) {
      await ports.store.putPictureFocus(id, focus);
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
  return { kind: "stored", picture: { id, capturedAt, width, height, fileName, ...origin } };
}
