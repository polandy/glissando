/**
 * Why a video is refused at import: this browser cannot play it, it is over `MAX_VIDEO_BYTES`, or
 * it is shorter than the shortest excerpt.
 */
export type VideoRefusal = "videoUnplayable" | "videoTooLarge" | "videoTooShort";

/** A video the import cannot take in; the import skips it with `reason` and goes on. */
export class VideoRefusedError extends Error {
  constructor(
    readonly fileName: string,
    readonly reason: VideoRefusal,
    options?: ErrorOptions,
  ) {
    super(`the video "${fileName}" is refused: ${reason}`, options);
    this.name = "VideoRefusedError";
  }
}
