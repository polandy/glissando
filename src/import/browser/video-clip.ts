import { fitWithin, DISPLAY_BOUND } from "../downscale";
import { localWallTime } from "../exif-capture-date";
import { MILLISECONDS_PER_SECOND } from "../../player/slideshow";
import type { OpenedClip } from "../video-read";

const POSTER_TYPE = "image/jpeg";
const POSTER_QUALITY = 0.92;
const MIN_READY_STATE_WITH_FRAME = 2;

/**
 * Loads a video file the way the player will play it, in a `<video>` element; null when the
 * browser cannot decode its video track or it has no known end. `canPlayType` is no verdict (Chrome
 * answers "" for a playable .mov), so loading the first frame decides.
 */
export async function openClipInVideoElement(file: File): Promise<OpenedClip | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const close = () => {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  };
  const loaded = await new Promise<boolean>((resolve) => {
    video.onloadeddata = () => resolve(true);
    video.onerror = () => resolve(false);
    video.src = url;
  });
  const durationMs = video.duration * MILLISECONDS_PER_SECOND;
  if (!loaded || video.videoWidth === 0 || !Number.isFinite(durationMs)) {
    close();
    return null;
  }
  return {
    durationMs: Math.round(durationMs),
    posterFrame: (atMs) => frameAt(video, file, atMs),
    close,
  };
}

async function frameAt(video: HTMLVideoElement, file: File, atMs: number): Promise<File> {
  const seconds = atMs / MILLISECONDS_PER_SECOND;
  if (video.currentTime !== seconds || video.readyState < MIN_READY_STATE_WITH_FRAME) {
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = seconds;
    });
  }
  const size = fitWithin({ width: video.videoWidth, height: video.videoHeight }, DISPLAY_BOUND);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("this browser offers no 2D canvas to draw a video's poster with");
  }
  context.drawImage(video, 0, 0, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, POSTER_TYPE, POSTER_QUALITY),
  );
  if (blob === null) {
    throw new Error(`the canvas could not encode the poster of "${file.name}"`);
  }
  return new File([blob], `${file.name}.jpg`, { type: POSTER_TYPE });
}

/**
 * A video's capture time: the container's creation time as the device's wall time (as EXIF
 * dates are, see `captureDate`), else the file's date. A container mediabunny cannot read falls
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
