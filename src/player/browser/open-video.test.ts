import { describe, expect, it } from "vitest";
import { openVideoElement } from "./open-video";
import { VideoElementPool } from "./video-element-pool";
import type { VideoOutput } from "./video-playback";

const OUTPUT: VideoOutput = {
  unlock: () => undefined,
  route: () => ({ set: () => undefined, dispose: () => undefined }),
};

class FakeElement extends EventTarget {
  src = "";
  currentTime = 0;
  muted = false;
  playsInline = false;
  preload = "";
  readyState = 0;
  seeking = false;
  play = () => Promise.resolve();
  pause = () => undefined;
  load = () => undefined;
  removeAttribute = () => undefined;
}

function setUp(read: (src: string) => Promise<Blob>) {
  const element = new FakeElement();
  const urls: string[] = [];
  const revoked: string[] = [];
  const open = (src: string) =>
    openVideoElement(src, 1, {
      output: OUTPUT,
      createElement: () => element as unknown as HTMLVideoElement,
      source: {
        openVideo: read,
        urls: {
          create: () => {
            urls.push("blob:clip");
            return "blob:clip";
          },
          revoke: (url) => revoked.push(url),
        },
      },
    });
  return { element, open, urls, revoked };
}

describe("openVideoElement", () => {
  it("uses the src as a URL without a source", () => {
    const element = new FakeElement();
    openVideoElement("https://x/clip.mp4", 1, {
      output: OUTPUT,
      createElement: () => element as unknown as HTMLVideoElement,
    });
    expect(element.src).toBe("https://x/clip.mp4");
  });

  it("reads the clip's bytes, sets the object URL and revokes the object URL on dispose", async () => {
    const { element, open, urls, revoked } = setUp(() => Promise.resolve(new Blob(["x"])));
    const playback = open("media-1");
    expect(urls).toEqual([]);

    await playback.play(0);

    expect(element.src).toBe("blob:clip");
    playback.dispose();
    expect(revoked).toEqual(["blob:clip"]);
  });

  it("does not leak an object URL when disposed before the bytes arrived", async () => {
    let arrive: (blob: Blob) => void = () => undefined;
    const { open, revoked } = setUp(() => new Promise<Blob>((resolve) => (arrive = resolve)));
    const playback = open("media-1");
    playback.dispose();

    arrive(new Blob(["x"]));
    await Promise.resolve();
    await Promise.resolve();

    expect(revoked).toEqual(["blob:clip"]);
  });
});

describe("openVideoElement with a pool", () => {
  it("acquires its element from the pool instead of creating a fresh one", () => {
    const pooled = new FakeElement();
    const fresh = new FakeElement();
    const pool = new VideoElementPool(1, () => pooled as unknown as HTMLVideoElement);
    const playback = openVideoElement("https://x/clip.mp4", 1, {
      output: OUTPUT,
      pool,
      createElement: () => fresh as unknown as HTMLVideoElement,
    });
    expect(pooled.src).toBe("https://x/clip.mp4");
    expect(fresh.src).toBe("");
    playback.dispose();
  });

  it("returns its element to the pool on dispose, for the next clip to reuse", () => {
    const pooled = new FakeElement();
    const pool = new VideoElementPool(1, () => pooled as unknown as HTMLVideoElement);
    const playback = openVideoElement("a", 1, { output: OUTPUT, pool });

    playback.dispose();

    expect(pool.acquire()).toBe(pooled as unknown as HTMLVideoElement);
  });

  it("routes a pooled element through the pool, so a reused element is not routed twice", () => {
    const pooled = new FakeElement();
    const pool = new VideoElementPool(1, () => pooled as unknown as HTMLVideoElement);
    const routeCalls: HTMLVideoElement[] = [];
    const output: VideoOutput = {
      unlock: () => undefined,
      route: (element) => {
        routeCalls.push(element);
        return { set: () => undefined, dispose: () => undefined };
      },
    };

    openVideoElement("a", 1, { output, pool }).dispose();
    openVideoElement("b", 1, { output, pool }).dispose();

    expect(routeCalls).toHaveLength(1);
  });
});
