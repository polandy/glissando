import { localWallTime } from "../exif-capture-date";
import { MILLISECONDS_PER_SECOND } from "../../player/slideshow";
import type { OpenedClip } from "../video-read";
import { loadClipMetadata } from "./clip-metadata";
import { decodedFrameAt, posterFile, seekedFrameAt } from "./clip-poster";

/**
 * Loads a video file the way the player will play it, in a `<video>` element; null when the
 * browser cannot decode its video track or it has no known end. `canPlayType` is no verdict (Chrome
 * answers "" for a playable .mov), so loading its metadata (`loadClipMetadata`) decides. Its length is
 * where its picture ends: the element reports the longer track, and a sound track running past the
 * picture would hold the last frame still for the difference. A container mediabunny cannot read
 * keeps the element's length, its error passed to `log`.
 */
export async function openClipInVideoElement(
  file: File,
  log: (error: unknown) => void,
): Promise<OpenedClip | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  const close = () => {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  };
  const metadata = await loadClipMetadata(video, url);
  if (metadata === null || metadata.width === 0 || !Number.isFinite(metadata.durationMs)) {
    close();
    return null;
  }
  const pictureEndMs = await videoTrackEndMs(file, log);
  return {
    durationMs: Math.round(Math.min(metadata.durationMs, pictureEndMs ?? metadata.durationMs)),
    posterFrame: (atMs) => frameAt(video, file, atMs, log),
    close,
  };
}

/** Where the file's video track ends; null when mediabunny cannot read the container. */
async function videoTrackEndMs(file: File, log: (error: unknown) => void): Promise<number | null> {
  try {
    const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    try {
      const track = await input.getPrimaryVideoTrack();
      return track === null ? null : (await track.computeDuration()) * MILLISECONDS_PER_SECOND;
    } finally {
      input.dispose();
    }
  } catch (error) {
    log(error);
    return null;
  }
}

/** The poster at `atMs`: decoded where mediabunny can, else drawn from the seeked element. */
async function frameAt(
  video: HTMLVideoElement,
  file: File,
  atMs: number,
  log: (error: unknown) => void,
): Promise<File> {
  const frame = (await decodedFrameAt(file, atMs, log)) ?? (await seekedFrameAt(video, atMs));
  return posterFile(frame, file.name);
}

/**
 * A video's capture time: the container's creation time as the device's wall time (as EXIF
 * dates are, see `readPictureExif`), else the file's date. A container mediabunny cannot read falls
 * back too; the playability check is what refuses the file.
 */
export async function videoCaptureDate(file: File, log: (error: unknown) => void): Promise<string> {
  try {
    const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    try {
      const { date } = await input.getMetadataTags();
      if (date !== undefined && !Number.isNaN(date.getTime())) {
        return localWallTime(date);
      }
    } finally {
      input.dispose();
    }
  } catch (error) {
    log(error);
  }
  return localWallTime(new Date(file.lastModified));
}
