import { describe, expect, it } from "vitest";
import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichPhoto,
  type ImmichUnavailableKind,
} from "../immich/immich-client";
import { immichPictureSource } from "./immich-picture-source";
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

function setUp(video: () => Promise<Blob>, playable = true) {
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
      gps: () => Promise.resolve(null),
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
        gps: () => Promise.resolve(null),
      },
      decode: () => Promise.reject(new Error("no")),
      reportUnavailable: () => undefined,
      log: () => undefined,
    });

    await expect(source.read()).rejects.toBeInstanceOf(VideoRefusedError);
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
