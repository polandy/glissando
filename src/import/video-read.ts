import { MIN_VIDEO_EXCERPT_MS, MAX_VIDEO_BYTES } from "../library/own-video";
import type { DecodedPicture } from "./downscale";
import type { ReadPicture } from "./picture-source";
import { VideoRefusedError } from "./video-refusal";

/** A clip loaded far enough to know its length and to show a frame of it. */
export interface OpenedClip {
  readonly durationMs: number;
  /** The frame at `atMs` as a picture file, upright as the browser shows it. */
  posterFrame(atMs: number): Promise<File>;
  close(): void;
}

export interface VideoReaders {
  /** Null when this browser cannot play the file (`canPlayType`, then loading its metadata). */
  openClip(file: File): Promise<OpenedClip | null>;
  decode(file: File): Promise<DecodedPicture>;
}

/** An import's clip starts at the clip's start, so its poster is the first frame. */
const POSTER_AT_MS = 0;

/**
 * A video file read for the import: refused when it is too big, cannot be played or is too short,
 * else its poster decoded like a picture plus the file itself (ADR-0034).
 */
export async function readVideoFile(file: File, readers: VideoReaders): Promise<ReadPicture> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new VideoRefusedError(file.name, "videoTooLarge");
  }
  const clip = await readers.openClip(file);
  if (clip === null) {
    throw new VideoRefusedError(file.name, "videoUnplayable");
  }
  try {
    if (clip.durationMs < MIN_VIDEO_EXCERPT_MS) {
      throw new VideoRefusedError(file.name, "videoTooShort");
    }
    const decoded = await readers.decode(await clip.posterFrame(POSTER_AT_MS));
    return { decoded, focus: null, video: { blob: file, sourceMs: clip.durationMs } };
  } finally {
    clip.close();
  }
}
