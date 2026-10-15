import type { ImmichPhoto } from "../immich/immich-client";
import { DISPLAY_BOUND, fitWithin, type Size } from "../import/downscale";
import type { SkippedFile } from "../import/picture-import";
import { isSamePicture, type PictureIdentity } from "../library/picture-identity";
import type { PictureColours } from "../library/picture-colours";
import type { StoredPicture } from "../library/stored-slideshow";

/** The size a picture gets whose size Immich has not read; the rendition played is authoritative. */
const UNREAD_SIZE: Size = { width: DISPLAY_BOUND.longEdge, height: DISPLAY_BOUND.shortEdge };

export interface LinkedPhotos {
  /** In the order picked. */
  readonly pictures: readonly StoredPicture[];
  /** Photos skipped as already in the slideshow or picked twice (ADR-0016). */
  readonly skipped: readonly SkippedFile[];
}

export interface LinkImmichPhotosPorts {
  /** A linked photo's colours (ADR-0033); its full size is never downloaded, only a thumbnail. */
  colours(photo: ImmichPhoto): Promise<PictureColours>;
}

/**
 * Picked Immich photos as pictures of a server slideshow, linked, not downloaded
 * (`dev-docs/server_library/SERVER_DOCUMENT.md`): each picture's id is its asset id and its
 * size Immich's fitted into the display bound. Each kept photo's colours are read from a
 * thumbnail, the only part of it fetched.
 */
export async function linkImmichPhotos(
  photos: readonly ImmichPhoto[],
  existing: readonly PictureIdentity[],
  ports: LinkImmichPhotosPorts,
  /** Pictures taken in before, in the same import: a photo among them was chosen twice. */
  taken: readonly PictureIdentity[] = [],
): Promise<LinkedPhotos> {
  const pictures: StoredPicture[] = [];
  const skipped: SkippedFile[] = [];
  for (const photo of photos) {
    const identity = identityOf(photo);
    const matches = (other: PictureIdentity) => isSamePicture(other, identity);
    if (existing.some(matches)) {
      skipped.push({ fileName: identity.fileName, reason: "alreadyIn" });
    } else if (taken.some(matches) || pictures.some(matches)) {
      skipped.push({ fileName: identity.fileName, reason: "chosenTwice" });
    } else {
      pictures.push(await linkedPicture(photo, ports));
    }
  }
  return { pictures, skipped };
}

function identityOf(photo: ImmichPhoto): PictureIdentity {
  return { fileName: photo.fileName, capturedAt: photo.takenAt, immichAssetId: photo.id };
}

async function linkedPicture(
  photo: ImmichPhoto,
  ports: LinkImmichPhotosPorts,
): Promise<StoredPicture> {
  return {
    id: photo.id,
    immichAssetId: photo.id,
    fileName: photo.fileName,
    capturedAt: photo.takenAt,
    colours: await ports.colours(photo),
    ...fitWithin(photo.size ?? UNREAD_SIZE, DISPLAY_BOUND),
  };
}
