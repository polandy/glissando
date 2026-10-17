import type { VideoPlayback } from "../ports";
import type { ObjectUrlPort } from "./picture-loader";
import type { VideoElementPool } from "./video-element-pool";
import { VideoElementPlayback, type VideoOutput } from "./video-playback";

/** Where clips come from when a slide's `video.src` is no URL the browser can load itself. */
export interface VideoSource {
  /** Reads a clip's bytes, e.g. from local storage by media id. */
  readonly openVideo: (src: string) => Promise<Blob>;
  readonly urls: ObjectUrlPort;
}

export interface OpenVideoOptions {
  readonly output: VideoOutput;
  readonly source?: VideoSource;
  readonly createElement?: () => HTMLVideoElement;
  /** A page-wide pool of gesture-blessed elements (ADR-0035); its own element wins over `createElement`. */
  readonly pool?: VideoElementPool;
}

const createVideoElement = (): HTMLVideoElement => document.createElement("video");

/**
 * Opens a clip in a `<video>` element. With a `VideoSource` its bytes are read only when the
 * clip is first needed and the object URL lives until `dispose`.
 */
export function openVideoElement(
  src: string,
  volume: number,
  { output, source, createElement = createVideoElement, pool }: OpenVideoOptions,
): VideoPlayback {
  const element = pool?.acquire() ?? createElement();
  const routedOutput: VideoOutput =
    pool === undefined
      ? output
      : { unlock: () => output.unlock(), route: (el) => pool.routeOnce(el, output) };
  const releaseToPool = () => pool?.release(element);
  if (source === undefined) {
    element.src = src;
    return new VideoElementPlayback(
      element,
      volume,
      routedOutput,
      Promise.resolve(),
      releaseToPool,
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
  const sourceReady = source.openVideo(src).then((blob) => {
    url = source.urls.create(blob);
    if (disposed) {
      revoke();
      return;
    }
    element.src = url;
  });
  return new VideoElementPlayback(element, volume, routedOutput, sourceReady, () => {
    disposed = true;
    revoke();
    releaseToPool();
  });
}
