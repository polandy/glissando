import { describe, expect, it } from "vitest";
import type { ClipSoundOutput } from "./music-output";
import { VIDEO_RATE_TOLERANCE_MS, VideoElementPlayback, type VideoOutput } from "./video-playback";

const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;
const END_MS = 20_000;

/** A `<video>` fake covering only what `follow` reads and writes. */
class FakeElement extends EventTarget {
  currentTime = 0;
  muted = false;
  volume = 1;
  playsInline = false;
  /** Counts writes to `playbackRate`, so a test can tell a redundant assignment from none. */
  playbackRateAssignments = 0;
  #playbackRate = 1;
  get playbackRate(): number {
    return this.#playbackRate;
  }
  set playbackRate(value: number) {
    this.playbackRateAssignments += 1;
    this.#playbackRate = value;
  }
  preload = "";
  readyState = HAVE_CURRENT_DATA;
  seeking = false;
  paused = false;
  src = "";
  removeAttribute(name: string): void {
    if (name === "src") {
      this.src = "";
    }
  }
}

const OUTPUT: VideoOutput = {
  unlock: () => undefined,
  clipSoundOutput: (): ClipSoundOutput | null => null,
};

function setUp(volume = 1) {
  const element = new FakeElement();
  const playback = new VideoElementPlayback(
    element as unknown as HTMLVideoElement,
    volume,
    END_MS,
    OUTPUT,
    Promise.resolve(null),
    Promise.resolve(),
    () => undefined,
  );
  return { element, playback };
}

describe("VideoElementPlayback.follow", () => {
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

  it("catches up a muted clip behind the clock by playing faster, without a seek", () => {
    const { element, playback } = setUp(0);
    element.readyState = HAVE_FUTURE_DATA;
    element.currentTime = 10;

    playback.follow(10_000 + VIDEO_RATE_TOLERANCE_MS + 1);

    expect(element.currentTime).toBe(10);
    expect(element.playbackRate).toBeGreaterThan(1);
  });

  it("lets a muted clip ahead of the clock play slower", () => {
    const { element, playback } = setUp(0);
    element.readyState = HAVE_FUTURE_DATA;
    element.currentTime = 10.4;

    playback.follow(10_000);

    expect(element.playbackRate).toBeLessThan(1);
  });

  it("settles a muted clip back to the normal rate once close enough to the clock", () => {
    const { element, playback } = setUp(0);
    element.readyState = HAVE_FUTURE_DATA;
    element.currentTime = 10;
    playback.follow(10_400);

    playback.follow(10_000 + VIDEO_RATE_TOLERANCE_MS);

    expect(element.playbackRate).toBe(1);
  });

  it("does not reassign playbackRate on a second follow at the same catch-up rate", () => {
    const { element, playback } = setUp(0);
    element.readyState = HAVE_FUTURE_DATA;
    element.currentTime = 10;
    const clipMs = 10_000 + VIDEO_RATE_TOLERANCE_MS + 1;

    playback.follow(clipMs);
    expect(element.playbackRateAssignments).toBe(1);

    playback.follow(clipMs);

    expect(element.playbackRateAssignments).toBe(1);
  });

  it("does not stack seeks while one is under way", () => {
    const { element, playback } = setUp();
    element.readyState = HAVE_FUTURE_DATA;
    element.seeking = true;
    playback.follow(5000);
    expect(element.currentTime).toBe(0);
  });
});
