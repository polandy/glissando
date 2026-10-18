import {
  DISPLAY_BOUND,
  fitsWithin,
  THUMBNAIL_BOUND,
  type Bound,
  type Size,
} from "../import/downscale";
import type { MediaDecoders } from "./media-decoders";
import type { MediaDescriptor } from "./media-descriptors";
import { readPictureHeader } from "./picture-header";

/**
 * Checks one medium before it is stored (ADR-0038): a picture's size is read from its header and
 * bounded before it is decoded, so one that would take gigabytes to decode is refused unread; a
 * picture, song or clip is then decoded (or, a clip, loaded), not only checksummed. Returns why
 * `path` is damaged, or null when it passed.
 */
export async function checkMediaFile(
  path: string,
  data: Blob,
  descriptor: MediaDescriptor,
  decoders: MediaDecoders,
): Promise<string | null> {
  switch (descriptor.kind) {
    case "picture":
      return checkPicture(path, data, descriptor, decoders, DISPLAY_BOUND);
    case "thumbnail":
      return checkPicture(path, data, descriptor, decoders, THUMBNAIL_BOUND);
    case "music":
      return (await decoders.music(data)) ? null : `"${path}" does not decode as music`;
    case "video":
      return (await decoders.clip(data)) ? null : `"${path}" does not decode as a clip`;
  }
}

async function checkPicture(
  path: string,
  data: Blob,
  descriptor: MediaDescriptor,
  decoders: MediaDecoders,
  bound: Bound,
): Promise<string | null> {
  const header = await readPictureHeader(data);
  if (header === null) {
    return `"${path}" has no readable picture header`;
  }
  if (!fitsWithin(header, bound)) {
    return boundError(path, header, bound);
  }
  // A thumbnail's descriptor carries no declared size (ADR-0038); only a display picture's does.
  const mismatch = declaredSizeMismatch(path, header, descriptor.size);
  if (mismatch !== null) {
    return mismatch;
  }
  const decoded = await decoders.picture(data);
  if (decoded === null) {
    return `"${path}" does not decode as a picture`;
  }
  if (decoded.width !== header.width || decoded.height !== header.height) {
    return `"${path}" decodes to ${decoded.width}×${decoded.height}, not the ${header.width}×${header.height} its header declares`;
  }
  return null;
}

function boundError(path: string, size: Size, bound: Bound): string {
  return (
    `"${path}" is ${size.width}×${size.height}, beyond the ` +
    `${bound.longEdge}×${bound.shortEdge} bound`
  );
}

function declaredSizeMismatch(
  path: string,
  header: Size,
  declared: Size | undefined,
): string | null {
  if (
    declared === undefined ||
    (header.width === declared.width && header.height === declared.height)
  ) {
    return null;
  }
  return (
    `"${path}" is ${header.width}×${header.height}, not the ` +
    `${declared.width}×${declared.height} the manifest declares`
  );
}
