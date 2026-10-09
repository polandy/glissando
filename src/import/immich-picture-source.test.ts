import { describe, expect, it } from "vitest";
import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichFace,
  type ImmichPhoto,
  type ImmichThumbnailSize,
  type ImmichUnavailableKind,
} from "../immich/immich-client";
import type { DecodedPicture } from "./downscale";
import { immichPictureSource } from "./immich-picture-source";
import { PictureNotDownloadedError } from "./picture-source";
import { UnreadablePictureError } from "./unreadable-picture";

const PHOTO: ImmichPhoto = {
  id: "asset-1",
  fileName: "IMG_0001.HEIC",
  takenAt: "2025-07-01T10:00:00Z",
};

const FACE: ImmichFace = { imageWidth: 100, imageHeight: 50, x1: 25, y1: 5, x2: 75, y2: 25 };

const UNDECODABLE = "undecodable";

/** Serves blobs by what they hold; `fails` makes that call reject with the given error. */
class FakeImmichClient {
  readonly calls: string[] = [];
  original_ = new Blob(["original bytes"], { type: "image/heic" });
  preview = new Blob(["preview bytes"], { type: "image/jpeg" });
  faceList: readonly ImmichFace[] = [FACE];
  fails: Partial<Record<"original" | "thumbnail" | "faces", Error>> = {};

  readonly original = (photoId: string): Promise<Blob> => {
    this.calls.push(`original ${photoId}`);
    return this.fails.original
      ? Promise.reject(this.fails.original)
      : Promise.resolve(this.original_);
  };

  readonly thumbnail = (photoId: string, size: ImmichThumbnailSize): Promise<Blob> => {
    this.calls.push(`thumbnail ${photoId} ${size}`);
    return this.fails.thumbnail
      ? Promise.reject(this.fails.thumbnail)
      : Promise.resolve(this.preview);
  };

  readonly faces = (photoId: string): Promise<readonly ImmichFace[]> => {
    this.calls.push(`faces ${photoId}`);
    return this.fails.faces ? Promise.reject(this.fails.faces) : Promise.resolve(this.faceList);
  };
}

/** Decodes a file to a picture that names its bytes; bytes containing UNDECODABLE fail. */
async function decode(file: File): Promise<DecodedPicture> {
  const bytes = await file.text();
  if (bytes.includes(UNDECODABLE)) {
    throw new UnreadablePictureError(file.name);
  }
  return {
    width: 300,
    height: 200,
    display: new Blob([`${bytes} as ${file.name} (${file.type})`]),
    thumbnail: new Blob([bytes]),
  };
}

function setUp(client = new FakeImmichClient()) {
  const reported: ImmichUnavailableKind[] = [];
  const logged: unknown[] = [];
  const source = immichPictureSource(PHOTO, {
    client,
    decode,
    reportUnavailable: (kind) => reported.push(kind),
    log: (error) => logged.push(error),
  });
  return { client, reported, logged, source };
}

const sourceFor = (client: FakeImmichClient) => setUp(client).source;

describe("immichPictureSource", () => {
  it("is named after the photo's file and counts as a picture, as Immich lists photos only", () => {
    const source = sourceFor(new FakeImmichClient());

    expect(source.fileName).toBe("IMG_0001.HEIC");
    expect(source.mimeType.startsWith("image/")).toBe(true);
  });

  it("decodes the original, dated by Immich and aimed at the largest face", async () => {
    const client = new FakeImmichClient();

    const read = await sourceFor(client).read();

    expect(await read.decoded.display.text()).toBe("original bytes as IMG_0001.HEIC (image/heic)");
    expect(read.capturedAt).toBe("2025-07-01T10:00:00Z");
    expect(read.focus).toEqual({
      kind: "subject",
      box: { x: 0.25, y: 0.1, width: 0.5, height: 0.4 },
    });
    expect(client.calls).toEqual(["original asset-1", "faces asset-1"]);
  });

  it("brings no focus for a photo without faces", async () => {
    const client = new FakeImmichClient();
    client.faceList = [];

    const read = await sourceFor(client).read();

    expect(await read.decoded.thumbnail.text()).toBe("original bytes");
    expect(read.focus).toBeNull();
  });

  it("falls back to Immich's preview when the browser cannot decode the original", async () => {
    const client = new FakeImmichClient();
    client.original_ = new Blob([UNDECODABLE], { type: "image/heic" });

    const read = await sourceFor(client).read();

    expect(await read.decoded.display.text()).toBe("preview bytes as IMG_0001.HEIC (image/jpeg)");
    expect(client.calls).toContain("thumbnail asset-1 preview");
  });

  it("is unreadable when the preview cannot be decoded either", async () => {
    const client = new FakeImmichClient();
    client.original_ = new Blob([UNDECODABLE], { type: "image/heic" });
    client.preview = new Blob([UNDECODABLE], { type: "image/jpeg" });

    await expect(sourceFor(client).read()).rejects.toBeInstanceOf(UnreadablePictureError);
  });

  it.each(["original", "thumbnail"] as const)(
    "is not downloaded when Immich is unavailable for the %s, keeping the cause and telling why",
    async (call) => {
      const { client, reported, logged, source } = setUp();
      client.original_ = new Blob([UNDECODABLE], { type: "image/heic" });
      const unavailable = new ImmichUnavailableError("keyRejected");
      client.fails[call] = unavailable;

      const failure: unknown = await source.read().catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(PictureNotDownloadedError);
      expect((failure as PictureNotDownloadedError).cause).toBe(unavailable);
      expect(reported).toEqual(["keyRejected"]);
      expect(logged).toEqual([]);
    },
  );

  it.each([
    ["original", 404],
    ["original", 500],
    ["thumbnail", 400],
  ] as const)(
    "is not downloaded when Immich answers the %s with %i, keeping the cause",
    async (call, code) => {
      const { client, reported, source } = setUp();
      client.original_ = new Blob([UNDECODABLE], { type: "image/heic" });
      const failed = new ImmichRequestFailedError(`GET ${call}`, code);
      client.fails[call] = failed;

      const failure: unknown = await source.read().catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(PictureNotDownloadedError);
      expect((failure as PictureNotDownloadedError).cause).toBe(failed);
      expect(reported).toEqual([]);
    },
  );

  it.each([
    ["Immich is unavailable", new ImmichUnavailableError("unreachable"), ["unreachable"]],
    ["Immich answers 404", new ImmichRequestFailedError("GET faces", 404), []],
    ["the answer does not match Immich's API", new Error("not Immich's shape"), []],
  ])(
    "keeps a decoded picture without focus and logs the error when its faces fail as %s",
    async (_name, error, expectedReports) => {
      const { client, reported, logged, source } = setUp();
      client.fails.faces = error;

      const read = await source.read();

      expect(await read.decoded.display.text()).toBe(
        "original bytes as IMG_0001.HEIC (image/heic)",
      );
      expect(read.focus).toBeNull();
      expect(logged).toEqual([error]);
      expect(reported).toEqual(expectedReports);
    },
  );

  it("lets an unexpected error of the original through as it is", async () => {
    const { client, source } = setUp();
    const unexpected = new Error("an answer that does not match the Immich API");
    client.fails.original = unexpected;

    await expect(source.read()).rejects.toBe(unexpected);
  });
});
