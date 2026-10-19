import { describe, expect, it } from "vitest";
import { VideoElementPlayback, type VideoOutput } from "./video-playback";
import type { ClipSoundOutput } from "./music-output";

const END_MS = 20_000;

const OUTPUT: VideoOutput = {
  unlock: () => undefined,
  clipSoundOutput: (): ClipSoundOutput | null => null,
};

/** A `<video>` fake covering only what dispose and play's start-up read and write. */
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
  play(): Promise<void> {
    return Promise.resolve();
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
class ListenerTrackingElement extends FakeElement {
  activeListeners = 0;
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

function playbackFor(element: FakeElement): VideoElementPlayback {
  return new VideoElementPlayback(
    element as unknown as HTMLVideoElement,
    1,
    END_MS,
    OUTPUT,
    Promise.resolve(null),
    Promise.resolve(),
    () => undefined,
  );
}

describe("VideoElementPlayback, disposal", () => {
  it("removes its listeners from a reused element once disposed", () => {
    const element = new ListenerTrackingElement();
    const playback = playbackFor(element);
    expect(element.activeListeners).toBeGreaterThan(0);

    playback.dispose();

    expect(element.activeListeners).toBe(0);
  });

  it("stops a second clip's listener from firing on a disposed clip's former element", () => {
    const element = new FakeElement();
    const first = playbackFor(element);
    let firstReady = 0;
    first.onFrameReady(() => (firstReady += 1));
    first.dispose();

    const second = playbackFor(element);
    let secondReady = 0;
    second.onFrameReady(() => (secondReady += 1));

    element.dispatchEvent(new Event("seeked"));

    expect(firstReady).toBe(0);
    expect(secondReady).toBe(1);
  });
});

describe("VideoElementPlayback.play, starting close to the clock", () => {
  it("does not seek a clip already within the start tolerance of its place", async () => {
    const element = new FakeElement();
    const playback = playbackFor(element);
    element.currentTime = 0;

    await playback.play(40);

    expect(element.currentTime).toBe(0);
  });

  it("seeks a clip further than the start tolerance from its place", async () => {
    const element = new FakeElement();
    const playback = playbackFor(element);
    element.currentTime = 0;

    await playback.play(1000);

    expect(element.currentTime).toBe(1);
  });
});
