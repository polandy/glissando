import type { PictureSource } from "./picture-source";
import { readVideoFile, type VideoReaders } from "./video-read";

export interface LocalVideoReaders extends VideoReaders {
  /** The container's creation time, else the file's date, as `captureDate()` writes it. */
  captureDate(file: File): Promise<string>;
}

/** A picked or dropped video file; like a picture file it brings no focus. */
export function localVideoSource(file: File, readers: LocalVideoReaders): PictureSource {
  return {
    fileName: file.name,
    mimeType: file.type,
    identify: async () => ({
      fileName: file.name,
      capturedAt: await readers.captureDate(file),
      fileBytes: file.size,
    }),
    read: () => readVideoFile(file, readers),
  };
}
