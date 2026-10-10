import type { ImmichPhoto } from "../immich/immich-client";
import { DISPLAY_BOUND, fitWithin, type Size } from "../import/downscale";
import type { SkippedFile } from "../import/picture-import";
import { isSamePicture, type PictureIdentity } from "../library/picture-identity";
import type { StoredPicture } from "../library/stored-slideshow";

/** The size a picture gets whose size Immich has not read; the rendition played is authoritative. */
const UNREAD_SIZE: Size = { width: DISPLAY_BOUND.longEdge, height: DISPLAY_BOUND.shortEdge };

export interface LinkedPhotos {
  /** In the order picked. */
  readonly pictures: readonly StoredPicture[];
  /** Photos skipped as already in the slideshow or picked twice (ADR-0016). */
  readonly skipped: readonly SkippedFile[];
}

/**
 * Picked Immich photos as pictures of a server slideshow, linked, not downloaded
 * (`dev-docs/SERVER_LIBRARY.md`, The server document): each picture's id is its asset id and its
 * size Immich's fitted into the display bound.
 */
export function linkImmichPhotos(
  photos: readonly ImmichPhoto[],
  existing: readonly PictureIdentity[],
  /** Pictures taken in before, in the same import: a photo among them was chosen twice. */
  taken: readonly PictureIdentity[] = [],
): LinkedPhotos {
  const pictures: StoredPicture[] = [];
  const skipped: SkippedFile[] = [];
  for (const photo of photos) {
    const picture = linkedPicture(photo);
    const matches = (other: PictureIdentity) => isSamePicture(other, picture);
    if (existing.some(matches)) skipped.push({ fileName: picture.fileName, reason: "alreadyIn" });
    else if (taken.some(matches) || pictures.some(matches))
      skipped.push({ fileName: picture.fileName, reason: "chosenTwice" });
    else pictures.push(picture);
  }
  return { pictures, skipped };
}

function linkedPicture(photo: ImmichPhoto): StoredPicture {
  return {
    id: photo.id,
    immichAssetId: photo.id,
    fileName: photo.fileName,
    capturedAt: photo.takenAt,
    ...fitWithin(photo.size ?? UNREAD_SIZE, DISPLAY_BOUND),
  };
}
