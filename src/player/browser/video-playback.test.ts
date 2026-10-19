import { describe, expect, it } from "vitest";
import { VideoPlaybackError } from "../ports";
import type { ClipSoundOutput } from "./music-output";
import { VideoElementPlayback, VIDEO_RATE_TOLERANCE_MS, type VideoOutput } from "./video-playback";

const HAVE_NOTHING = 0;
const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;
const END_MS = 10_000;

class FakeElement extends EventTarget {
  currentTime = 0;
  muted = false;
  volume = 1;
  playsInline = false;
  playbackRate = 1;
  preload = "";
  readyState = HAVE_CURRENT_DATA;
  seeking = false;
  paused = false;
  src = "";
  playCalls = 0;
  pauseCalls = 0;
  loadCalls = 0;
  playResult: Promise<void> = Promise.resolve();
  play(): Promise<void> {
    this.playCalls += 1;
    return this.playResult;
  }
  pause(): void {
    this.pauseCalls += 1;
  }
  load(): void {
    this.loadCalls += 1;
  }
  removeAttribute(name: string): void {
    if (name === "src") {
      this.src = "";
    }
  }
  fire(type: string): void {
    this.dispatchEvent(new Event(type));
  }
}

function outputWithUnlock() {
  const unlocked: string[] = [];
  const output: VideoOutput = {
    unlock: () => unlocked.push("unlock"),
    clipSoundOutput: (): ClipSoundOutput | null => null,
  };
  return { output, unlocked };
}

function setUp(volume = 1, decoded: Promise<AudioBuffer | null> = Promise.resolve(null)) {
  const element = new FakeElement();
  const { output, unlocked } = outputWithUnlock();
  const released: string[] = [];
  const playback = new VideoElementPlayback(
    element as unknown as HTMLVideoElement,
    volume,
    END_MS,
    output,
    decoded,
    Promise.resolve(),
    () => released.push("release"),
  );
  return { element, playback, unlocked, released };
}

describe("VideoElementPlayback", () => {
  it("is always muted, picture only, whatever the clip's volume (ADR-0035)", () => {
    expect(setUp(1).element.muted).toBe(true);
    expect(setUp(0).element.muted).toBe(true);
  });

  it("sets up the element for inline playback", () => {
    expect(setUp(1).element).toMatchObject({ playsInline: true, preload: "auto" });
  });

  it("holds a hard seek's poster until its frame is ready", () => {
    const { element, playback } = setUp();
    playback.seek(1500);
    expect(element.currentTime).toBe(1.5);
    expect(playback.frame()).toBeNull();

    element.fire("seeked");

    expect(playback.frame()).toBe(element);
  });

  it("has no frame before the element holds data", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_NOTHING;
    expect(playback.frame()).toBeNull();
  });

  it("tells when a frame became ready", () => {
    const { element, playback } = setUp();
    let ready = 0;
    playback.onFrameReady(() => (ready += 1));
    element.fire("seeked");
    element.fire("loadeddata");
    expect(ready).toBe(2);
  });

  it("plays from a time, unlocking the music's context in the same gesture", async () => {
    const { element, playback, unlocked } = setUp();
    await playback.play(2000);
    expect(element.currentTime).toBe(2);
    expect(element.playCalls).toBe(1);
    expect(unlocked).toEqual(["unlock"]);
  });

  it("does not seek again to where the clip already is", async () => {
    const { element, playback } = setUp();
    element.currentTime = 2;
    await playback.play(2000);
    expect(element.currentTime).toBe(2);
  });

  it("rejects with VideoPlaybackError on a refusal other than a pause interrupting the start", async () => {
    const { element, playback } = setUp();
    element.playResult = Promise.reject(new DOMException("blocked", "InvalidStateError"));
    await expect(playback.play(0)).rejects.toBeInstanceOf(VideoPlaybackError);
    expect(element.playCalls).toBe(1);
  });

  it("does not count a pause interrupting the start as a refusal", async () => {
    const { element, playback } = setUp();
    element.playResult = Promise.reject(new DOMException("interrupted", "AbortError"));
    await expect(playback.play(0)).resolves.toBeUndefined();
  });

  it("applies a seek requested before the source loaded once its metadata is there", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_NOTHING;
    playback.seek(3000);
    element.currentTime = 0;
    element.fire("loadedmetadata");
    expect(element.currentTime).toBe(3);
  });

  it("shows the clip's frame once its metadata is there when it already is at the requested start", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_NOTHING;
    playback.seek(0);
    element.readyState = HAVE_CURRENT_DATA;
    element.fire("loadedmetadata");
    expect(playback.frame()).toBe(element);
  });

  it("pauses, and on dispose frees the element and the object URL", () => {
    const { element, playback, released } = setUp();
    playback.pause();
    playback.dispose();
    expect(element.pauseCalls).toBeGreaterThanOrEqual(1);
    expect(element.loadCalls).toBe(1);
    expect(released).toEqual(["release"]);
  });

  it("tells its failure listener when the clip's bytes could not be read, without a play", async () => {
    const failures: Error[] = [];
    const { output } = outputWithUnlock();
    const playback = new VideoElementPlayback(
      new FakeElement() as unknown as HTMLVideoElement,
      1,
      END_MS,
      output,
      Promise.resolve(null),
      Promise.reject(new Error("missing")),
      () => undefined,
    );
    playback.onFailure((error) => failures.push(error));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(failures).toHaveLength(1);
    expect(failures[0]).toBeInstanceOf(VideoPlaybackError);
  });

  it("tells its failure listener when the element cannot play the clip", () => {
    const { element, playback } = setUp();
    const failures: Error[] = [];
    playback.onFailure((error) => failures.push(error));
    element.fire("error");
    expect(failures).toHaveLength(1);
  });

  it("does not start a clip that was disposed while its bytes were still being read", async () => {
    let ready: () => void = () => undefined;
    const element = new FakeElement();
    const { output } = outputWithUnlock();
    const playback = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      END_MS,
      output,
      Promise.resolve(null),
      new Promise<void>((resolve) => (ready = resolve)),
      () => undefined,
    );
    const playing = playback.play(0);
    playback.dispose();
    ready();
    await playing;
    expect(element.playCalls).toBe(0);
  });

  it("rejects play when the clip's bytes could not be read", async () => {
    const element = new FakeElement();
    const { output } = outputWithUnlock();
    const playback = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      END_MS,
      output,
      Promise.resolve(null),
      Promise.reject(new Error("missing")),
      () => undefined,
    );
    await expect(playback.play(0)).rejects.toBeInstanceOf(VideoPlaybackError);
    expect(element.playCalls).toBe(0);
  });

  it("catches a muted clip up by rate once it is close to the clock, same as before (ADR-0035)", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_FUTURE_DATA;
    element.currentTime = 2;
    playback.follow(2000 + VIDEO_RATE_TOLERANCE_MS + 500);
    expect(element.playbackRate).not.toBe(1);
  });

  it("plays a clip's sound through the track built from its own decode and endMs", async () => {
    const decodedBuffer = {} as AudioBuffer;
    const gain = {
      gain: { setValueAtTime: () => undefined },
      connect: () => undefined,
      disconnect: () => undefined,
    };
    const bufferSource = {
      buffer: null as AudioBuffer | null,
      connect: () => undefined,
      disconnect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
    };
    const context = {
      currentTime: 0,
      createBufferSource: () => bufferSource,
      createGain: () => gain,
    };
    const clipSoundOutput: ClipSoundOutput = { context, destination: gain };
    const output: VideoOutput = { unlock: () => undefined, clipSoundOutput: () => clipSoundOutput };
    const element = new FakeElement();
    const playback = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      END_MS,
      output,
      Promise.resolve(decodedBuffer),
      Promise.resolve(),
      () => undefined,
    );

    await playback.play(500);
    await Promise.resolve();
    playback.follow(500);

    expect(bufferSource.buffer).toBe(decodedBuffer);
  });
});
