import type { DecodedPicture } from "./downscale";
import type { ExifGps } from "./exif-gps";
import type { PictureSource } from "./picture-source";
import { UnreadablePictureError } from "./unreadable-picture";

/**
 * `decode` and `captureDate` reject with `UnreadablePictureError` for a file they cannot read;
 * each is tried twice. `gps` never rejects with it (no GPS tag reads the same as an unreadable
 * one: null), so it is tried twice only on the same error the other two retry on.
 */
export interface LocalPictureReaders {
  decode(file: File): Promise<DecodedPicture>;
  captureDate(file: File): Promise<string>;
  gps(file: File): Promise<ExifGps | null>;
}

/**
 * Android Chrome fails a picked file's read or decode intermittently, so a second try often
 * succeeds; any other error is not retried.
 */
async function retryOnce<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!(error instanceof UnreadablePictureError)) {
      throw error;
    }
    return operation();
  }
}

/** A picked or dropped file; a file brings no focus. */
export function localPictureSource(file: File, readers: LocalPictureReaders): PictureSource {
  return {
    fileName: file.name,
    mimeType: file.type,
    identify: async () => ({
      fileName: file.name,
      capturedAt: await retryOnce(() => readers.captureDate(file)),
      fileBytes: file.size,
    }),
    read: async () => {
      const decoded = await retryOnce(() => readers.decode(file));
      const gps = await retryOnce(() => readers.gps(file));
      return { decoded, focus: null, ...(gps === null ? {} : { gps }) };
    },
  };
}
