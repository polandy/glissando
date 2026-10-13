import type { DecodedPicture } from "./downscale";
import type { PictureSource } from "./picture-source";
import { UnreadablePictureError } from "./unreadable-picture";

/** Both reject with `UnreadablePictureError` for a file they cannot read; each is tried twice. */
export interface LocalPictureReaders {
  decode(file: File): Promise<DecodedPicture>;
  captureDate(file: File): Promise<string>;
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
    read: async () => ({ decoded: await retryOnce(() => readers.decode(file)), focus: null }),
  };
}
