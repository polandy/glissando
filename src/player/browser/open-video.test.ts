import { describe, expect, it } from "vitest";
import { openVideoElement } from "./open-video";
import type { ClipSoundOutput } from "./music-output";
import type { VideoElementPort, VideoOutput } from "./video-playback";
import { settleMicrotasks } from "../../testing/settle-microtasks";

const OUTPUT: VideoOutput = {
  unlock: () => undefined,
  clipSoundOutput: (): ClipSoundOutput | null => null,
};
const END_MS = 4000;

class FakeElement extends EventTarget implements VideoElementPort {
  src = "";
  currentTime = 0;
  muted = false;
  playsInline = false;
  playbackRate = 1;
  preload: VideoElementPort["preload"] = "";
  readyState = 0;
  seeking = false;
  paused = true;
  error = null;
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
  const logged: unknown[] = [];
  const open = (src: string, volume = 1) =>
    openVideoElement(src, volume, END_MS, {
      output: OUTPUT,
      createElement: () => element,
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
      log: (error) => logged.push(error),
    });
  return { element, open, urls, revoked, logged };
}

describe("openVideoElement", () => {
  it("uses the src as a URL without a source", () => {
    const element = new FakeElement();
    openVideoElement("https://x/clip.mp4", 1, END_MS, {
      output: OUTPUT,
      createElement: () => element,
    });
    expect(element.src).toBe("https://x/clip.mp4");
  });

  it("is always muted, picture only: the clip's sound plays through Web Audio instead (ADR-0035)", () => {
    const element = new FakeElement();
    openVideoElement("https://x/clip.mp4", 1, END_MS, {
      output: OUTPUT,
      createElement: () => element,
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
    await settleMicrotasks();

    expect(revoked).toEqual(["blob:clip"]);
  });
});

/** Records every read and decode, each answering at once. */
function recordingClipReads(blob = new Blob(["x"])) {
  const reads: string[] = [];
  const decoded: Blob[] = [];
  return {
    reads,
    decoded,
    read: (src: string) => {
      reads.push(src);
      return Promise.resolve(blob);
    },
    decodeClipSound: (clip: Blob) => {
      decoded.push(clip);
      return Promise.resolve(null);
    },
  };
}

describe("openVideoElement's clip sound", () => {
  it("decodes the same blob read for the element, without reading it twice", async () => {
    const blob = new Blob(["x"]);
    const clip = recordingClipReads(blob);
    const { open } = setUp(clip.read, clip.decodeClipSound);

    open("media-1").dispose();
    await settleMicrotasks();

    expect(clip.reads).toEqual(["media-1"]);
    expect(clip.decoded).toEqual([blob]);
  });

  it("never decodes a silent clip: no decoder call for a clip with no volume", async () => {
    const clip = recordingClipReads();
    const { open } = setUp(clip.read, clip.decodeClipSound);

    open("media-1", 0).dispose();
    await settleMicrotasks();

    expect(clip.reads).toEqual(["media-1"]);
    expect(clip.decoded).toEqual([]);
  });

  it("without a decoder, reads the clip once for the picture: the clip just plays silent", () => {
    const clip = recordingClipReads();
    const { open } = setUp(clip.read);

    open("media-1").dispose();

    // The element's own bytes are still read for the picture; only the decode step is skipped.
    expect(clip.reads).toEqual(["media-1"]);
  });

  it("logs and stays silent when the decode rejects, without failing the clip", async () => {
    const { open, logged } = setUp(
      () => Promise.resolve(new Blob(["x"])),
      () => Promise.reject(new Error("could not decode")),
    );

    const playback = open("media-1");
    await playback.play(0);
    await settleMicrotasks();

    expect(logged).toHaveLength(1);
  });
});
