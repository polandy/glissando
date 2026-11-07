import { describe, expect, it } from "vitest";
import {
  ImmichDownloadTooLargeError,
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichPhoto,
  type ImmichUnavailableKind,
} from "../immich/immich-client";
import { MAX_VIDEO_BYTES } from "../library/own-video";
import { immichPictureSource, type ImmichVideoReaders } from "./immich-picture-source";
import { PictureNotDownloadedError } from "./picture-source";
import { VideoRefusedError } from "./video-refusal";

const CLIP_MS = 12_000;

const VIDEO: ImmichPhoto = {
  id: "clip-1",
  fileName: "IMG_0002.MOV",
  takenAt: "2025-07-01T10:00:00Z",
  size: { width: 1920, height: 1080 },
  video: { durationMs: CLIP_MS },
};

function setUp(video: ImmichVideoReaders["client"]["video"], playable = true) {
  const reported: ImmichUnavailableKind[] = [];
  const faceCalls: string[] = [];
  const source = immichPictureSource(VIDEO, {
    client: {
      original: () => Promise.reject(new Error("a video is not read as an original")),
      thumbnail: () => Promise.reject(new Error("a video has no thumbnail fallback")),
      faces: (id) => {
        faceCalls.push(id);
        return Promise.resolve([]);
      },
    },
    decode: (file) =>
      Promise.resolve({
        width: 300,
        height: 200,
        display: new Blob([file.name]),
        thumbnail: new Blob([file.name]),
      }),
    videos: {
      client: { video },
      openClip: (file) =>
        Promise.resolve(
          playable
            ? {
                durationMs: CLIP_MS,
                posterFrame: () => Promise.resolve(new File([file], "poster.jpg")),
                close: () => undefined,
              }
            : null,
        ),
    },
    reportUnavailable: (kind) => reported.push(kind),
    log: () => undefined,
  });
  return { source, reported, faceCalls };
}

const BYTES = new Blob(["clip bytes"], { type: "video/mp4" });

describe("immichPictureSource for a video", () => {
  it("counts as a video file and is identified without a download", async () => {
    const { source } = setUp(() => Promise.resolve(BYTES));

    expect(source.mimeType).toBe("video/*");
    expect(await source.identify()).toEqual({
      fileName: "IMG_0002.MOV",
      capturedAt: "2025-07-01T10:00:00Z",
      immichAssetId: "clip-1",
    });
  });

  it("downloads the playable version whole and keeps it as the clip, without faces", async () => {
    const { source, faceCalls } = setUp(() => Promise.resolve(BYTES));

    const read = await source.read();

    expect(read.video?.sourceMs).toBe(CLIP_MS);
    expect(await read.video?.blob.text()).toBe("clip bytes");
    expect(read.focus).toBeNull();
    expect(faceCalls).toEqual([]);
  });

  it("refuses a video where the device brings no video readers", async () => {
    const source = immichPictureSource(VIDEO, {
      client: {
        original: () => Promise.reject(new Error("no")),
        thumbnail: () => Promise.reject(new Error("no")),
        faces: () => Promise.resolve([]),
      },
      decode: () => Promise.reject(new Error("no")),
      reportUnavailable: () => undefined,
      log: () => undefined,
    });

    await expect(source.read()).rejects.toBeInstanceOf(VideoRefusedError);
  });

  it("refuses a video Immich announces as over MAX_VIDEO_BYTES as too large", async () => {
    const limits: number[] = [];
    const { source } = setUp((id, maxBytes) => {
      limits.push(maxBytes);
      return Promise.reject(new ImmichDownloadTooLargeError(`GET ${id}`, maxBytes + 1, maxBytes));
    });

    const refusal = await source.read().catch((error: unknown) => error);

    expect(limits).toEqual([MAX_VIDEO_BYTES]);
    expect(refusal).toBeInstanceOf(VideoRefusedError);
    expect((refusal as VideoRefusedError).reason).toBe("videoTooLarge");
  });

  it("cancels the download with the read's signal", async () => {
    const { source } = setUp(
      (_id, _maxBytes, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(signal.reason as Error));
        }),
    );
    const cancel = new AbortController();
    const reading = source.read(cancel.signal);

    cancel.abort();

    await expect(reading).rejects.toBe(cancel.signal.reason);
  });

  it("refuses a version this browser cannot play, naming the video", async () => {
    const { source } = setUp(() => Promise.resolve(BYTES), false);

    await expect(source.read()).rejects.toBeInstanceOf(VideoRefusedError);
  });

  it.each([
    ["is unavailable", new ImmichUnavailableError("unreachable"), ["unreachable"]],
    ["answers 404", new ImmichRequestFailedError("GET playback", 404), []],
  ])("reports a download that fails as Immich %s", async (_name, error, reports) => {
    const { source, reported } = setUp(() => Promise.reject(error));

    await expect(source.read()).rejects.toBeInstanceOf(PictureNotDownloadedError);
    expect(reported).toEqual(reports);
  });
});
