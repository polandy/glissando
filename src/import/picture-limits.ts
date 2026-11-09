import { readPictureDimensions } from "./picture-dimensions";
import { readPictureHead, UnreadablePictureError } from "./unreadable-picture";

const MIB = 1024 * 1024;
/** Chrome's canvas edge limit, squared: the largest picture the browser draws. */
const CANVAS_EDGE_LIMIT = 16384;
/** Room for a JPEG's frame header behind an EXIF segment, which can fill 64 KiB. */
const HEAD_BYTES = 256 * 1024;

/** The most a picture may weigh and claim in pixels before the browser is asked to decode it. */
export interface PictureLimits {
  readonly bytes: number;
  readonly pixels: number;
}

const MAX_PICTURE_BYTES = 100 * MIB;
const MAX_PICTURE_PIXELS = CANVAS_EDGE_LIMIT * CANVAS_EDGE_LIMIT;

export const PICTURE_LIMITS: PictureLimits = {
  bytes: MAX_PICTURE_BYTES,
  pixels: MAX_PICTURE_PIXELS,
};

/**
 * Rejects with `UnreadablePictureError` ("tooLarge") for a picture over a limit, so a huge file
 * or a small one whose header claims a huge size is never decoded. A format whose header is not
 * read here (AVIF, HEIC, ...) meets only the byte limit.
 */
export async function assertPictureWithinLimits(file: File, limits: PictureLimits): Promise<void> {
  const tooLarge = (): UnreadablePictureError => new UnreadablePictureError(file.name, "tooLarge");
  if (file.size > limits.bytes) throw tooLarge();
  const size = readPictureDimensions(new Uint8Array(await readPictureHead(file, HEAD_BYTES)));
  if (size !== null && size.width * size.height > limits.pixels) throw tooLarge();
}
