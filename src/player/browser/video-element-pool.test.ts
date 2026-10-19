import { describe, expect, it } from "vitest";
import type { MusicVolume } from "./music-output";
import { VideoElementPlayback, type VideoOutput } from "./video-playback";
import { VIDEO_POOL_SIZE, VideoElementPool } from "./video-element-pool";

/** Minimal `<video>` fake: enough to drive the pool and, blessed, a real `VideoElementPlayback`. */
class FakeElement extends EventTarget {
  muted = false;
  currentTime = 0;
  playsInline = false;
  preload = "";
  readyState = 0;
  seeking = false;
  playCalls = 0;
  pauseCalls = 0;
  /** Set by `pause()`, modelling WebKit: blessed once this element played inside a gesture. */
  blessed = false;
  play(): Promise<void> {
    this.playCalls += 1;
    return !this.muted && !this.blessed
      ? Promise.reject(new DOMException("blocked", "NotAllowedError"))
      : Promise.resolve();
  }
  pause(): void {
    this.pauseCalls += 1;
    this.blessed = true;
  }
  load(): void {
    /* not needed by these tests */
  }
  removeAttribute(): void {
    /* not needed by these tests */
  }
}

function fakePool(size?: number) {
  const created: FakeElement[] = [];
  const createElement = () => {
    const element = new FakeElement();
    created.push(element);
    return element as unknown as HTMLVideoElement;
  };
  const pool = new VideoElementPool(size, createElement);
  return { pool, created };
}

function fakeOutput() {
  const routeCalls: HTMLVideoElement[] = [];
  const setCalls: number[] = [];
  const output: VideoOutput = {
    unlock: () => undefined,
    route: (element) => {
      routeCalls.push(element);
      const volume: MusicVolume = {
        set: (value) => setCalls.push(value),
        dispose: () => undefined,
      };
      return volume;
    },
  };
  return { output, routeCalls, setCalls };
}

describe("VideoElementPool", () => {
  it("creates elements up to its size the first time it unlocks them", () => {
    const { pool, created } = fakePool(2);
    pool.unlock();
    expect(created).toHaveLength(2);
  });

  it("plays and pauses every idle element when unlocking, swallowing the rejection", () => {
    const { pool, created } = fakePool(2);
    pool.unlock();
    expect(created.every((element) => element.playCalls === 1)).toBe(true);
    expect(created.every((element) => element.pauseCalls === 1)).toBe(true);
    expect(created.every((element) => element.blessed)).toBe(true);
  });

  it("does not bless an already-blessed element again on a later unlock", () => {
    const { pool, created } = fakePool(1);
    pool.unlock();
    pool.unlock();
    expect(created[0]?.playCalls).toBe(1);
  });

  it("hands acquire an idle pooled element rather than creating a new one", () => {
    const { pool, created } = fakePool(1);
    pool.unlock();
    const acquired = pool.acquire();
    expect(acquired).toBe(created[0]);
    expect(created).toHaveLength(1);
  });

  it("falls back to a fresh element once every pooled one is out", () => {
    const { pool, created } = fakePool(1);
    pool.acquire();
    const overflow = pool.acquire();
    expect(created).toHaveLength(2);
    expect(overflow).toBe(created[1]);
  });

  it("returns a released pooled element to the next acquire", () => {
    const { pool } = fakePool(1);
    const first = pool.acquire();
    pool.release(first);
    expect(pool.acquire()).toBe(first);
  });

  it("silences a released element's cached volume instead of leaving its last gain", () => {
    const { pool } = fakePool(1);
    const { output, setCalls } = fakeOutput();
    const element = pool.acquire();
    pool.routeOnce(element, output);
    pool.release(element);
    expect(setCalls).toEqual([0]);
  });

  it("routes a pooled element to Web Audio only once across reuses", () => {
    const { pool } = fakePool(1);
    const { output, routeCalls } = fakeOutput();
    const element = pool.acquire();
    const first = pool.routeOnce(element, output);
    pool.release(element);
    const reacquired = pool.acquire();
    const second = pool.routeOnce(reacquired, output);
    expect(routeCalls).toHaveLength(1);
    expect(second).toBe(first);
  });

  it("routes an element outside the pool fresh every time, since it is never reused", () => {
    const { pool } = fakePool(1);
    const { output, routeCalls } = fakeOutput();
    const outsider = new FakeElement() as unknown as HTMLVideoElement;
    pool.routeOnce(outsider, output);
    pool.routeOnce(outsider, output);
    expect(routeCalls).toHaveLength(2);
  });

  it("defaults its size to VIDEO_POOL_SIZE", () => {
    const { pool, created } = fakePool(undefined);
    pool.unlock();
    expect(created).toHaveLength(VIDEO_POOL_SIZE);
  });

  it("lets a clip play audibly, unmuted, on an element the pool unlocked", async () => {
    const { pool } = fakePool(1);
    pool.unlock();
    const element = pool.acquire();
    const output: VideoOutput = {
      unlock: () => undefined,
      route: () => ({ set: () => undefined, dispose: () => undefined }),
    };
    const playback = new VideoElementPlayback(
      element,
      1,
      output,
      Promise.resolve(),
      () => undefined,
    );

    await playback.play(0);

    expect((element as unknown as FakeElement).muted).toBe(false);
  });
});
