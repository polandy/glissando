import type { LiveFrame } from "../ports";

/** What tells whether a `<video>`'s picture changed; an `HTMLVideoElement` has it. */
export interface VideoPictureState {
  readonly paused: boolean;
  readonly currentTime: number;
  readonly seeking: boolean;
  readonly readyState: number;
  /** Calls back once the clip presents its next frame; absent where the browser has none. */
  readonly requestVideoFrameCallback?: (callback: () => void) => number;
}

/**
 * The version of the picture a live frame shows, so `PictureTextures.live` uploads a clip's
 * frame once per frame the clip presents rather than once per frame drawn (25 vs 60 a second).
 * A playing clip's version is the count of frames it presented, from `requestVideoFrameCallback`;
 * until it reports one, or in a browser without it, there is none. A paused clip's picture moves
 * only with a seek, so its version is its place and its loading state.
 */
export class LiveFrameVersions {
  readonly #presented = new WeakMap<VideoPictureState, number>();

  /** Equal versions mean the same picture; null when that cannot be told, so it is uploaded. */
  versionOf(frame: LiveFrame | VideoPictureState): string | null {
    if (!isVideo(frame)) {
      return null;
    }
    const presented = this.#presentedFrames(frame);
    if (frame.paused) {
      return `${presented}:${frame.currentTime}:${frame.seeking}:${frame.readyState}`;
    }
    return presented === 0 ? null : String(presented);
  }

  #presentedFrames(video: VideoPictureState): number {
    let presented = this.#presented.get(video);
    if (presented === undefined) {
      presented = 0;
      this.#presented.set(video, presented);
      this.#watch(video);
    }
    return presented;
  }

  #watch(video: VideoPictureState): void {
    video.requestVideoFrameCallback?.(() => {
      this.#presented.set(video, (this.#presented.get(video) ?? 0) + 1);
      this.#watch(video);
    });
  }
}

function isVideo(frame: LiveFrame | VideoPictureState): frame is VideoPictureState {
  return "currentTime" in frame && "paused" in frame;
}
