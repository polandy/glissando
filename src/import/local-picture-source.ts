import type { DecodedPicture } from "./downscale";
import type { PictureExif } from "./picture-exif";
import type { PictureSource } from "./picture-source";
import { UnreadablePictureError } from "./unreadable-picture";

/**
 * `decode` and `exif` reject with `UnreadablePictureError` for a file they cannot read; each is
 * tried twice, except a picture that is too large.
 */
export interface LocalPictureReaders {
  decode(file: File): Promise<DecodedPicture>;
  exif(file: File): Promise<PictureExif>;
}

/**
 * Android Chrome fails a picked file's read or decode intermittently, so a second try often
 * succeeds. A picture over the size limit would fail the same way again, so it is not retried,
 * nor is any other error.
 */
async function retryOnce<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!(error instanceof UnreadablePictureError) || error.stage === "tooLarge") {
      throw error;
    }
    return operation();
  }
}

/**
 * A picked or dropped file; a file brings no focus. Its EXIF is read once, for `identify()`, and
 * kept for `read()`: a file that turns unreadable in between keeps its GPS coordinate.
 */
export function localPictureSource(file: File, readers: LocalPictureReaders): PictureSource {
  let exif: Promise<PictureExif> | undefined;
  const readExif = (): Promise<PictureExif> => (exif ??= retryOnce(() => readers.exif(file)));
  return {
    fileName: file.name,
    mimeType: file.type,
    identify: async () => ({
      fileName: file.name,
      capturedAt: (await readExif()).capturedAt,
      fileBytes: file.size,
    }),
    read: async () => {
      const decoded = await retryOnce(() => readers.decode(file));
      const { gps } = await readExif();
      return { decoded, focus: null, ...(gps === null ? {} : { gps }) };
    },
  };
}
