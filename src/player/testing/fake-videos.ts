import type { LiveFrame, VideoFrameSource, VideoPlayback } from "../ports";

/** A `LiveFrame` stand-in for the node-run unit tests, which have no canvas; read back by `labelOf`. */
export function fakeLiveFrame(label: string): LiveFrame {
  return { width: 1, height: 1, label } as unknown as LiveFrame;
}

export function labelOf(frame: LiveFrame | undefined): string | undefined {
  return (frame as unknown as { label?: string } | undefined)?.label;
}

export class FakeVideo implements VideoPlayback {
  /** Every call in order, `follow` and `setVolume` included. */
  readonly calls: string[] = [];
  volume: number | undefined;
  disposed = false;
  ready = true;
  #frame: LiveFrame | null = null;
  #listener: (() => void) | null = null;
  #failureListener: ((error: Error) => void) | null = null;
  #refusal: Error | null = null;
  constructor(
    readonly src: string,
    readonly openedWithVolume: number,
  ) {}
  refuseNextPlay(error: Error): void {
    this.#refusal = error;
  }
  seek(clipMs: number): void {
    this.calls.push(`seek@${clipMs}`);
  }
  play(clipMs: number): Promise<void> {
    this.calls.push(`play@${clipMs}`);
    const refusal = this.#refusal;
    this.#refusal = null;
    return refusal ? Promise.reject(refusal) : Promise.resolve();
  }
  follow(clipMs: number): void {
    this.calls.push(`follow@${clipMs}`);
  }
  pause(): void {
    this.calls.push("pause");
  }
  setVolume(volume: number): void {
    this.volume = volume;
  }
  frame(): LiveFrame | null {
    return this.#frame;
  }
  isReady(): boolean {
    return this.ready;
  }
  onFrameReady(listener: () => void): void {
    this.#listener = listener;
  }
  onFailure(listener: (error: Error) => void): void {
    this.#failureListener = listener;
  }
  dispose(): void {
    this.disposed = true;
    this.calls.push("dispose");
  }
  /** The clip could not load, and tells the player's listener. */
  fail(error: Error): void {
    this.#failureListener?.(error);
  }
  /** The clip became able to play on, and tells the player's listener. */
  becomeReady(): void {
    this.ready = true;
    this.#listener?.();
  }
  /** The decoder delivered `frame`; tells the player's listener. */
  deliverFrame(frame: LiveFrame): void {
    this.#frame = frame;
    this.#listener?.();
  }
}

/** Opens a `FakeVideo` per call, in order. */
export class FakeVideos {
  readonly opened: FakeVideo[] = [];
  /** Whether a clip can play on as soon as it is opened. */
  readyOnOpen = true;
  readonly open = (src: string, volume: number): FakeVideo => {
    const video = new FakeVideo(src, volume);
    video.ready = this.readyOnOpen;
    this.opened.push(video);
    return video;
  };
  only(): FakeVideo {
    const [video, ...others] = this.opened;
    if (video === undefined || others.length > 0) {
      throw new Error(`expected one opened video, got ${this.opened.length}`);
    }
    return video;
  }
}

/** Answers `frameAt` with a frame labelled by its clip time, recording the requests. */
export class FakeVideoFrames implements VideoFrameSource {
  readonly requested: number[] = [];
  disposed = false;
  constructor(readonly src: string) {}
  frameAt(clipMs: number): Promise<LiveFrame> {
    this.requested.push(clipMs);
    return Promise.resolve(fakeLiveFrame(`${this.src}@${clipMs}`));
  }
  dispose(): void {
    this.disposed = true;
  }
}
