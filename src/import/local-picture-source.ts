import type { DecodedPicture } from "./downscale";
import type { PictureSource } from "./picture-source";

/** Both reject with `UnreadablePictureError` for a file they cannot read. */
export interface LocalPictureReaders {
  decode(file: File): Promise<DecodedPicture>;
  captureDate(file: File): Promise<string>;
}

/** A picked or dropped file; a file brings no focus. */
export function localPictureSource(file: File, readers: LocalPictureReaders): PictureSource {
  return {
    fileName: file.name,
    mimeType: file.type,
    identify: async () => ({
      fileName: file.name,
      capturedAt: await readers.captureDate(file),
      fileBytes: file.size,
    }),
    read: async () => ({ decoded: await readers.decode(file), focus: null }),
  };
}
