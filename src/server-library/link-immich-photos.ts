import type { ImmichPhoto } from "../immich/immich-client";
import { DISPLAY_BOUND, fitWithin, type Size } from "../import/downscale";
import { isSamePicture, type PictureIdentity } from "../library/picture-identity";
import type { StoredPicture } from "../library/stored-slideshow";

/** The size a picture gets whose size Immich has not read; the rendition played is authoritative. */
const UNREAD_SIZE: Size = { width: DISPLAY_BOUND.longEdge, height: DISPLAY_BOUND.shortEdge };

export interface LinkedPhotos {
  /** In the order picked. */
  readonly pictures: readonly StoredPicture[];
  /** Photos skipped as already in the slideshow or picked twice (ADR-0016). */
  readonly skipped: number;
}

/**
 * Picked Immich photos as pictures of a server slideshow, linked, not downloaded
 * (`dev-docs/SERVER_LIBRARY.md`, The server document): each picture's id is its asset id and its
 * size Immich's fitted into the display bound.
 */
export function linkImmichPhotos(
  photos: readonly ImmichPhoto[],
  existing: readonly PictureIdentity[],
): LinkedPhotos {
  const pictures: StoredPicture[] = [];
  for (const photo of photos) {
    const picture = linkedPicture(photo);
    const known = [...existing, ...pictures];
    if (!known.some((other) => isSamePicture(other, picture))) pictures.push(picture);
  }
  return { pictures, skipped: photos.length - pictures.length };
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
