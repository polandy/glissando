import { describe, expect, it } from "vitest";
import { MAX_VIDEO_BYTES } from "../library/own-video";
import type { DecodedPicture } from "./downscale";
import { localVideoSource } from "./local-video-source";
import { VideoRefusedError } from "./video-refusal";
import type { OpenedClip } from "./video-read";

const POSTER: DecodedPicture = {
  width: 400,
  height: 300,
  display: new Blob(["display"]),
  thumbnail: new Blob(["thumbnail"]),
};

function readers(clip: Pick<OpenedClip, "durationMs"> | null) {
  const calls = { posterAt: [] as number[], closed: 0, decoded: [] as string[] };
  return {
    calls,
    captureDate: () => Promise.resolve("2025-07-01T10:00:00Z"),
    openClip: () =>
      Promise.resolve(
        clip === null
          ? null
          : {
              durationMs: clip.durationMs,
              posterFrame: (atMs: number) => {
                calls.posterAt.push(atMs);
                return Promise.resolve(new File(["frame"], "frame.jpg", { type: "image/jpeg" }));
              },
              close: () => void (calls.closed += 1),
            },
      ),
    decode: (file: File) => (calls.decoded.push(file.name), Promise.resolve(POSTER)),
  };
}

const video = (size = 4) => new File(["x".repeat(size)], "clip.mp4", { type: "video/mp4" });

describe("localVideoSource", () => {
  it("is identified by its name, capture date and size without opening it", async () => {
    const fake = readers({ durationMs: 8000 });

    const identity = await localVideoSource(video(), fake).identify();

    expect(identity).toEqual({
      fileName: "clip.mp4",
      capturedAt: "2025-07-01T10:00:00Z",
      fileBytes: 4,
    });
    expect(fake.calls.posterAt).toEqual([]);
  });

  it("reads the poster at the clip's start and hands over the file and its length", async () => {
    const fake = readers({ durationMs: 8000 });
    const file = video();

    const read = await localVideoSource(file, fake).read();

    expect(read).toEqual({
      decoded: POSTER,
      focus: null,
      video: { blob: file, sourceMs: 8000 },
    });
    expect(fake.calls.posterAt).toEqual([0]);
    expect(fake.calls.decoded).toEqual(["frame.jpg"]);
    expect(fake.calls.closed).toBe(1);
  });

  it.each([
    ["a file this browser cannot play", null, 4, "videoUnplayable"],
    ["a clip shorter than the shortest excerpt", { durationMs: 499 }, 4, "videoTooShort"],
    ["a file over the size limit", { durationMs: 8000 }, MAX_VIDEO_BYTES + 1, "videoTooLarge"],
  ] as const)("refuses %s", async (_name, clip, size, reason) => {
    const fake = readers(clip);
    const file = { name: "clip.mp4", type: "video/mp4", size } as File;
    const failure = await localVideoSource(file, fake)
      .read()
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(VideoRefusedError);
    expect((failure as VideoRefusedError).reason).toBe(reason);
    expect(fake.calls.closed).toBe(clip === null || size > MAX_VIDEO_BYTES ? 0 : 1);
  });
});
