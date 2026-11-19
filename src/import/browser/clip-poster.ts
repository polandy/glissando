import { fitWithin, DISPLAY_BOUND } from "../downscale";
import { MILLISECONDS_PER_SECOND } from "../../player/slideshow";

const POSTER_TYPE = "image/jpeg";
const POSTER_QUALITY = 0.92;

/** A video frame ready to draw, at the size the browser shows it. */
export interface ClipFrame {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

/**
 * The frame at `atMs` decoded by mediabunny (WebCodecs), upright; null when it cannot read the
 * container or decode the track, its error passed to `log`. A `<video>` drawn into a canvas is no
 * substitute: WebKit paints it black whatever the element was waited for.
 */
export async function decodedFrameAt(
  file: File,
  atMs: number,
  log: (error: unknown) => void,
): Promise<ClipFrame | null> {
  try {
    const { ALL_FORMATS, BlobSource, CanvasSink, Input } = await import("mediabunny");
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    try {
      const track = await input.getPrimaryVideoTrack();
      if (track === null || !(await track.canDecode())) {
        return null;
      }
      const firstSeconds = await track.getFirstTimestamp();
      const size = { width: track.displayWidth, height: track.displayHeight };
      const sink = new CanvasSink(track, { width: fitWithin(size, DISPLAY_BOUND).width });
      const frame = await sink.getCanvas(Math.max(atMs / MILLISECONDS_PER_SECOND, firstSeconds));
      return frame === null
        ? null
        : { source: frame.canvas, width: frame.canvas.width, height: frame.canvas.height };
    } finally {
      input.dispose();
    }
  } catch (error) {
    log(error);
    return null;
  }
}

/**
 * The element's frame at `atMs`, drawn only once the seek there has completed and its frame has
 * been presented: a completed seek may precede the paint, and a canvas then reads black.
 */
export async function seekedFrameAt(video: HTMLVideoElement, atMs: number): Promise<ClipFrame> {
  const presented = new Promise<void>((resolve) =>
    video.requestVideoFrameCallback(() => resolve()),
  );
  const seeked = new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });
  video.currentTime = atMs / MILLISECONDS_PER_SECOND;
  await Promise.all([seeked, presented]);
  return { source: video, width: video.videoWidth, height: video.videoHeight };
}

/** `frame` as the poster picture of `fileName`, a JPEG within the display bound. */
export async function posterFile(frame: ClipFrame, fileName: string): Promise<File> {
  const size = fitWithin(frame, DISPLAY_BOUND);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("this browser offers no 2D canvas to draw a video's poster with");
  }
  context.drawImage(frame.source, 0, 0, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, POSTER_TYPE, POSTER_QUALITY),
  );
  if (blob === null) {
    throw new Error(`the canvas could not encode the poster of "${fileName}"`);
  }
  return new File([blob], `${fileName}.jpg`, { type: POSTER_TYPE });
}
