import { describe, expect, it } from "vitest";
import { VideoPlaybackError } from "../ports";
import type { MusicVolume } from "./music-output";
import {
  VIDEO_RATE_TOLERANCE_MS,
  VIDEO_SEEK_DRIFT_MS,
  VideoElementPlayback,
  type VideoOutput,
} from "./video-playback";

const HAVE_NOTHING = 0;
const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;

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

function setUp(volume = 1) {
  const element = new FakeElement();
  const routed: number[] = [];
  const disposed: string[] = [];
  const output: VideoOutput = {
    unlock: () => disposed.push("unlock"),
    route: (): MusicVolume => ({
      set: (value) => routed.push(value),
      dispose: () => disposed.push("route"),
    }),
  };
  const released: string[] = [];
  const playback = new VideoElementPlayback(
    element as unknown as HTMLVideoElement,
    volume,
    output,
    Promise.resolve(),
    () => released.push("release"),
  );
  return { element, playback, routed, disposed, released };
}

describe("VideoElementPlayback", () => {
  it("sets up the element for inline playback, with sound only when the clip has volume", () => {
    expect(setUp(1).element).toMatchObject({ playsInline: true, preload: "auto", muted: false });
    expect(setUp(0).element.muted).toBe(true);
  });

  it("routes the volume through the output when unmuted", () => {
    const { playback, routed } = setUp(0.5);
    playback.setVolume(0.25);
    expect(routed).toEqual([0.5, 0.25]);
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

  it("plays from a time, unlocking the sound in the same gesture", async () => {
    const { element, playback, disposed } = setUp();
    await playback.play(2000);
    expect(element.currentTime).toBe(2);
    expect(element.playCalls).toBe(1);
    expect(disposed).toEqual(["unlock"]);
  });

  it("does not seek again to where the clip already is", async () => {
    const { element, playback } = setUp();
    element.currentTime = 2;
    await playback.play(2000);
    expect(element.currentTime).toBe(2);
  });

  it("rejects with VideoPlaybackError when the browser refuses to play", async () => {
    const { element, playback } = setUp();
    element.playResult = Promise.reject(new DOMException("blocked", "NotAllowedError"));
    await expect(playback.play(0)).rejects.toBeInstanceOf(VideoPlaybackError);
  });

  it("does not count a pause interrupting the start as a refusal", async () => {
    const { element, playback } = setUp();
    element.playResult = Promise.reject(new DOMException("interrupted", "AbortError"));
    await expect(playback.play(0)).resolves.toBeUndefined();
  });

  it("does not seek a clip that is still starting up, however far behind the clock it is", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_CURRENT_DATA;
    playback.follow(5000);
    expect(element.currentTime).toBe(0);

    element.readyState = HAVE_FUTURE_DATA;
    element.paused = true;
    playback.follow(5000);
    expect(element.currentTime).toBe(0);

    element.paused = false;
    playback.follow(5000);
    expect(element.currentTime).toBe(5);
  });

  it("catches up a clip behind the clock by playing faster, without a seek", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_FUTURE_DATA;
    element.currentTime = 10;

    playback.follow(10_000 + VIDEO_RATE_TOLERANCE_MS + 1);

    expect(element.currentTime).toBe(10);
    expect(element.playbackRate).toBeGreaterThan(1);
  });

  it("lets a clip ahead of the clock play slower", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_FUTURE_DATA;
    element.currentTime = 10.4;

    playback.follow(10_000);

    expect(element.playbackRate).toBeLessThan(1);
  });

  it("plays at the normal rate once close enough to the clock", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_FUTURE_DATA;
    element.currentTime = 10;
    playback.follow(10_400);

    playback.follow(10_000 + VIDEO_RATE_TOLERANCE_MS);

    expect(element.playbackRate).toBe(1);
  });

  it("seeks, keeping its frame, only once the clip is further off than catching up can mend", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_FUTURE_DATA;
    element.currentTime = 10;
    playback.follow(10_000 + VIDEO_SEEK_DRIFT_MS);
    expect(element.currentTime).toBe(10);

    playback.follow(10_000 + VIDEO_SEEK_DRIFT_MS + 1);

    expect(element.currentTime).toBeCloseTo(12.001, 6);
    expect(element.playbackRate).toBe(1);
    expect(playback.frame()).toBe(element);
  });

  it("does not stack seeks while one is under way", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_FUTURE_DATA;
    element.seeking = true;
    playback.follow(5000);
    expect(element.currentTime).toBe(0);
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

  it("pauses, and on dispose frees the element, the routing and the object URL", () => {
    const { element, playback, disposed, released } = setUp();
    playback.pause();
    playback.dispose();
    expect(element.pauseCalls).toBeGreaterThanOrEqual(1);
    expect(element.loadCalls).toBe(1);
    expect(disposed).toContain("route");
    expect(released).toEqual(["release"]);
  });

  it("tells its failure listener when the clip's bytes could not be read, without a play", async () => {
    const failures: Error[] = [];
    const playback = new VideoElementPlayback(
      new FakeElement() as unknown as HTMLVideoElement,
      1,
      { unlock: () => undefined, route: () => ({ set() {}, dispose() {} }) },
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
    const playback = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      { unlock: () => undefined, route: () => ({ set() {}, dispose() {} }) },
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
    const output: VideoOutput = {
      unlock: () => undefined,
      route: () => ({ set() {}, dispose() {} }),
    };
    const playback = new VideoElementPlayback(
      element as unknown as HTMLVideoElement,
      1,
      output,
      Promise.reject(new Error("missing")),
      () => undefined,
    );
    await expect(playback.play(0)).rejects.toBeInstanceOf(VideoPlaybackError);
    expect(element.playCalls).toBe(0);
  });
});
