import { MILLISECONDS_PER_SECOND } from "../../player/slideshow";

/** What loading a clip's metadata uses of a `<video>` element; the element itself is one. */
export interface ClipMetadataElement {
  preload: HTMLMediaElement["preload"];
  src: string;
  onloadedmetadata: ((event: Event) => void) | null;
  onerror: ((event: Event | string) => void) | null;
  readonly duration: number;
  readonly videoWidth: number;
}

export interface ClipMetadata {
  /** The length the element reports; `Infinity` for a stream without a known end. */
  readonly durationMs: number;
  /** The picture's width; 0 when the file holds no video track the browser decodes. */
  readonly width: number;
}

/**
 * Loads only a clip's metadata into `video` (buffering a whole clip fails at random in
 * WebKit-GTK) and settles at `loadedmetadata`: Safari fires no `loadeddata` under
 * `preload="metadata"` before a play or seek. Null when the element reports an error.
 */
export function loadClipMetadata(
  video: ClipMetadataElement,
  url: string,
): Promise<ClipMetadata | null> {
  return new Promise((resolve) => {
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      resolve({ durationMs: video.duration * MILLISECONDS_PER_SECOND, width: video.videoWidth });
    video.onerror = () => resolve(null);
    video.src = url;
  });
}
