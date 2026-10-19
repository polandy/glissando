import { describe, expect, it, vi } from "vitest";
import { openVideoElement } from "./open-video";
import type { ClipSoundOutput } from "./music-output";
import type { VideoOutput } from "./video-playback";

const OUTPUT: VideoOutput = {
  unlock: () => undefined,
  clipSoundOutput: (): ClipSoundOutput | null => null,
};
const END_MS = 4000;

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

function setUp(
  read: (src: string) => Promise<Blob>,
  decodeClipSound?: (blob: Blob) => Promise<AudioBuffer | null>,
) {
  const element = new FakeElement();
  const urls: string[] = [];
  const revoked: string[] = [];
  const open = (src: string, volume = 1) =>
    openVideoElement(src, volume, END_MS, {
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
      ...(decodeClipSound === undefined ? {} : { decodeClipSound }),
    });
  return { element, open, urls, revoked };
}

describe("openVideoElement", () => {
  it("uses the src as a URL without a source", () => {
    const element = new FakeElement();
    openVideoElement("https://x/clip.mp4", 1, END_MS, {
      output: OUTPUT,
      createElement: () => element as unknown as HTMLVideoElement,
    });
    expect(element.src).toBe("https://x/clip.mp4");
  });

  it("is always muted, picture only: the clip's sound plays through Web Audio instead (ADR-0035)", () => {
    const element = new FakeElement();
    openVideoElement("https://x/clip.mp4", 1, END_MS, {
      output: OUTPUT,
      createElement: () => element as unknown as HTMLVideoElement,
    });
    expect(element.muted).toBe(true);
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

describe("openVideoElement's clip sound", () => {
  it("decodes the same blob read for the element, without reading it twice", async () => {
    const blob = new Blob(["x"]);
    const read = vi.fn(() => Promise.resolve(blob));
    const decodeClipSound = vi.fn(() => Promise.resolve(null));
    const { open } = setUp(read, decodeClipSound);

    open("media-1").dispose();
    await Promise.resolve();
    await Promise.resolve();

    expect(read).toHaveBeenCalledTimes(1);
    expect(decodeClipSound).toHaveBeenCalledWith(blob);
  });

  it("never decodes a silent clip: no decoder call for a clip with no volume", async () => {
    const decodeClipSound = vi.fn(() => Promise.resolve(null));
    const { open } = setUp(() => Promise.resolve(new Blob(["x"])), decodeClipSound);

    open("media-1", 0).dispose();
    await Promise.resolve();
    await Promise.resolve();

    expect(decodeClipSound).not.toHaveBeenCalled();
  });

  it("without a decoder, never fetches or decodes: the clip just plays silent", () => {
    const read = vi.fn(() => Promise.resolve(new Blob(["x"])));
    const { open } = setUp(read);

    open("media-1").dispose();

    // The element's own bytes are still read for the picture; only the decode step is skipped.
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("warns and stays silent when the decode rejects, without failing the clip", async () => {
    const warned: unknown[] = [];
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
      warned.push(args);
    });
    try {
      const { open } = setUp(
        () => Promise.resolve(new Blob(["x"])),
        () => Promise.reject(new Error("could not decode")),
      );

      const playback = open("media-1");
      await playback.play(0);
      await Promise.resolve();
      await Promise.resolve();

      expect(warned).toHaveLength(1);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
