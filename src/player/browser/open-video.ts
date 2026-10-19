import type { VideoPlayback } from "../ports";
import type { ObjectUrlPort } from "./picture-loader";
import { VideoElementPlayback, type VideoOutput } from "./video-playback";

/** Where clips come from when a slide's `video.src` is no URL the browser can load itself. */
export interface VideoSource {
  /** Reads a clip's bytes, e.g. from local storage by media id. */
  readonly openVideo: (src: string) => Promise<Blob>;
  readonly urls: ObjectUrlPort;
}

/** Decodes a clip's whole sound into one `AudioBuffer`; null for a clip with none (`decodeClipSound`). */
export type DecodeClipSound = (blob: Blob) => Promise<AudioBuffer | null>;

export interface OpenVideoOptions {
  readonly output: VideoOutput;
  readonly source?: VideoSource;
  readonly createElement?: () => HTMLVideoElement;
  /** Without it, a clip's sound never decodes and the clip plays silent. */
  readonly decodeClipSound?: DecodeClipSound;
}

const createVideoElement = (): HTMLVideoElement => document.createElement("video");

/**
 * Opens a clip in a `<video>` element, always muted (ADR-0035): its picture only, drawn frame by
 * frame; its sound, if any, is decoded and played separately (`VideoElementPlayback`). With a
 * `VideoSource` its bytes are read only when the clip is first needed and the object URL lives
 * until `dispose`; `endMs` is the clip's own file-time clamp, for the sound decoded up to it.
 */
export function openVideoElement(
  src: string,
  volume: number,
  endMs: number,
  { output, source, createElement = createVideoElement, decodeClipSound }: OpenVideoOptions,
): VideoPlayback {
  const element = createElement();
  if (source === undefined) {
    element.src = src;
    // Every page that plays clips reads them through a `VideoSource`; a bare URL is picture only.
    return new VideoElementPlayback(
      element,
      volume,
      endMs,
      output,
      Promise.resolve(null),
      Promise.resolve(),
      () => undefined,
    );
  }
  let url: string | null = null;
  let disposed = false;
  const revoke = () => {
    if (url !== null) {
      source.urls.revoke(url);
      url = null;
    }
  };
  // Read once, shared with the decoder: a clip's bytes are not fetched twice over for its sound.
  const blob = source.openVideo(src);
  const sourceReady = blob.then((loadedBlob) => {
    url = source.urls.create(loadedBlob);
    if (disposed) {
      revoke();
      return;
    }
    element.src = url;
  });
  const decoded = decodedSound(volume, decodeClipSound, () => blob);
  return new VideoElementPlayback(element, volume, endMs, output, decoded, sourceReady, () => {
    disposed = true;
    revoke();
  });
}

/**
 * The clip's sound as a decoded buffer, starting as soon as `blobOf` has it; null at once for a
 * silent clip or without a decoder, so nothing is decoded for nothing. A decode that
 * fails is logged and the clip stays silent — it never fails or blocks the show.
 */
function decodedSound(
  volume: number,
  decodeClipSound: DecodeClipSound | undefined,
  blobOf: () => Promise<Blob>,
): Promise<AudioBuffer | null> {
  if (volume <= 0 || decodeClipSound === undefined) {
    return Promise.resolve(null);
  }
  return blobOf()
    .then((blob) => decodeClipSound(blob))
    .catch((error: unknown) => {
      console.warn("could not decode a video clip's sound", error);
      return null;
    });
}
