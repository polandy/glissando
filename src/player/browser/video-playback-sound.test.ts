import { describe, expect, it } from "vitest";
import { VideoPlaybackError } from "../ports";
import { VideoElementPlayback, type VideoOutput } from "./video-playback";

const OUTPUT: VideoOutput = {
  unlock: () => undefined,
  route: () => ({ set: () => undefined, dispose: () => undefined }),
};

/** A `<video>` fake whose `play()` answers a queued outcome per call, to script a refusal then a retry. */
class FakeElement extends EventTarget {
  currentTime = 0;
  muted = false;
  volume = 1;
  playsInline = false;
  playbackRate = 1;
  preload = "";
  readyState = 2;
  seeking = false;
  paused = false;
  src = "";
  playCalls = 0;
  playResults: Array<() => Promise<void>> = [];
  play(): Promise<void> {
    this.playCalls += 1;
    const next = this.playResults.shift();
    return next === undefined ? Promise.resolve() : next();
  }
  pause(): void {
    /* not needed by these tests */
  }
  load(): void {
    /* not needed by these tests */
  }
  removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }
}

/** A `<video>` fake that counts the listeners still attached to it, via the `AbortSignal` each carries. */
class ListenerTrackingElement extends EventTarget {
  currentTime = 0;
  muted = false;
  volume = 1;
  playsInline = false;
  playbackRate = 1;
  preload = "";
  readyState = 2;
  seeking = false;
  paused = false;
  src = "";
  activeListeners = 0;
  play(): Promise<void> {
    return Promise.resolve();
  }
  pause(): void {
    /* not needed by this test */
  }
  load(): void {
    /* not needed by this test */
  }
  removeAttribute(): void {
    this.src = "";
  }
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.activeListeners += 1;
    super.addEventListener(type, listener, options);
    const signal = typeof options === "object" ? options.signal : undefined;
    signal?.addEventListener("abort", () => (this.activeListeners -= 1), { once: true });
  }
}

const NOT_ALLOWED = () => Promise.reject(new DOMException("refused", "NotAllowedError"));

describe("VideoElementPlayback, the sound WebKit refuses", () => {
  it("plays an audible clip muted instead of stopping the show, when the browser refuses it", async () => {
    const element = new FakeElement();
    element.playResults = [NOT_ALLOWED, () => Promise.resolve()];
    const playback = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      OUTPUT,
      Promise.resolve(),
      () => undefined,
    );

    await expect(playback.play(0)).resolves.toBeUndefined();

    expect(element.muted).toBe(true);
    expect(element.playCalls).toBe(2);
  });

  it("still fails an already-muted clip the browser refuses", async () => {
    const element = new FakeElement();
    element.playResults = [NOT_ALLOWED];
    const playback = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      0,
      OUTPUT,
      Promise.resolve(),
      () => undefined,
    );

    await expect(playback.play(0)).rejects.toBeInstanceOf(VideoPlaybackError);
    expect(element.playCalls).toBe(1);
  });

  it("keeps a clip the safety net muted even once the slideshow sets its volume again", async () => {
    const element = new FakeElement();
    element.playResults = [NOT_ALLOWED, () => Promise.resolve()];
    const playback = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      OUTPUT,
      Promise.resolve(),
      () => undefined,
    );
    await playback.play(0);

    playback.setVolume(0.8);

    expect(element.muted).toBe(true);
  });

  it("removes its listeners from a reused element once disposed", () => {
    const element = new ListenerTrackingElement();
    const playback = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      OUTPUT,
      Promise.resolve(),
      () => undefined,
    );
    expect(element.activeListeners).toBeGreaterThan(0);

    playback.dispose();

    expect(element.activeListeners).toBe(0);
  });

  it("stops a second clip's listener from firing on a disposed clip's former element", () => {
    const element = new FakeElement();
    const first = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      OUTPUT,
      Promise.resolve(),
      () => undefined,
    );
    let firstReady = 0;
    first.onFrameReady(() => (firstReady += 1));
    first.dispose();

    const second = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      OUTPUT,
      Promise.resolve(),
      () => undefined,
    );
    let secondReady = 0;
    second.onFrameReady(() => (secondReady += 1));

    element.dispatchEvent(new Event("seeked"));

    expect(firstReady).toBe(0);
    expect(secondReady).toBe(1);
  });
});
