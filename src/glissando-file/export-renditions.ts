import { fitsWithin, THUMBNAIL_BOUND } from "../import/downscale";
import { MAX_THUMBNAIL_BYTES } from "./file-limits";
import { isPictureType } from "./manifest-paths";
import { readPictureHeader, type PictureSize } from "./picture-header";

/**
 * The display picture's own size, which the manifest declares and opening checks the file
 * against (ADR-0038); a server slideshow's stored size is only Immich's, fitted into the bound.
 */
export async function displaySize(display: Blob, pictureId: string): Promise<PictureSize> {
  const header = await readPictureHeader(display);
  if (header === null) {
    throw new Error(`the display picture of "${pictureId}" has no readable picture header`);
  }
  return header;
}

/**
 * Whether a stored thumbnail goes into the file as it is: one opening would refuse, as Immich's
 * own thumbnail at a resolution beyond the format's bound, is made anew from the display picture.
 */
export async function isCarriedAsItIs(thumbnail: Blob): Promise<boolean> {
  if (!isPictureType(thumbnail.type) || thumbnail.size > MAX_THUMBNAIL_BYTES) {
    return false;
  }
  const header = await readPictureHeader(thumbnail);
  return header !== null && fitsWithin(header, THUMBNAIL_BOUND);
}
