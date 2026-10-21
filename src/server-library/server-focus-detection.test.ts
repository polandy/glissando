import { describe, expect, it } from "vitest";
import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichFace,
} from "../immich/immich-client";
import { MediaNotFoundError } from "../library/stored-slideshow";
import { serverDetectionInput } from "./server-focus-detection";

const FACE: ImmichFace = { imageWidth: 100, imageHeight: 50, x1: 25, y1: 5, x2: 75, y2: 25 };
const DOWNSCALED = new Blob(["downscaled"]);

function detectorFor(options: {
  faces?: readonly ImmichFace[];
  facesError?: Error;
  previewError?: Error;
}) {
  const calls: string[] = [];
  const reported: string[] = [];
  const input = serverDetectionInput({
    immich: {
      faces: (assetId) => {
        calls.push(`faces ${assetId}`);
        if (options.facesError !== undefined) return Promise.reject(options.facesError);
        return Promise.resolve(options.faces ?? []);
      },
      thumbnail: (assetId, size) => {
        calls.push(`${size} ${assetId}`);
        if (options.previewError !== undefined) return Promise.reject(options.previewError);
        return Promise.resolve(new Blob([`preview ${assetId}`]));
      },
    },
    downscaleToThumbnail: (preview) => {
      calls.push(`downscale ${preview.size} bytes`);
      return Promise.resolve(DOWNSCALED);
    },
    reportUnavailable: (kind) => reported.push(kind),
  });
  return { input, calls, reported };
}

describe("serverDetectionInput", () => {
  it("answers Immich's face focus directly, without reading or downscaling a preview", async () => {
    const { input, calls } = detectorFor({ faces: [FACE] });

    const result = await input("asset-1");

    expect(result).toEqual({
      kind: "subject",
      box: { x: 0.25, y: 0.1, width: 0.5, height: 0.4 },
      foundBy: "immich-faces",
    });
    expect(calls).toEqual(["faces asset-1"]);
  });

  it("downscales Immich's preview for detection when Immich has no faces", async () => {
    const { input, calls } = detectorFor({ faces: [] });

    const result = await input("asset-1");

    expect(result).toBe(DOWNSCALED);
    expect(calls).toEqual(["faces asset-1", "preview asset-1", "downscale 15 bytes"]);
  });

  it("maps a 404 for the asset's faces to MediaNotFoundError", async () => {
    const { input } = detectorFor({ facesError: new ImmichRequestFailedError("GET faces", 404) });

    await expect(input("asset-gone")).rejects.toBeInstanceOf(MediaNotFoundError);
  });

  it("maps a 404 for the asset's preview to MediaNotFoundError", async () => {
    const { input } = detectorFor({
      previewError: new ImmichRequestFailedError("GET preview", 404),
    });

    await expect(input("asset-gone")).rejects.toBeInstanceOf(MediaNotFoundError);
  });

  it("reports and rejects when Immich is unreachable for faces", async () => {
    const failure = new ImmichUnavailableError("unreachable");
    const { input, reported } = detectorFor({ facesError: failure });

    await expect(input("asset-1")).rejects.toBe(failure);
    expect(reported).toEqual(["unreachable"]);
  });

  it("reports and rejects when Immich is unreachable for the preview", async () => {
    const failure = new ImmichUnavailableError("keyRejected");
    const { input, reported } = detectorFor({ previewError: failure });

    await expect(input("asset-1")).rejects.toBe(failure);
    expect(reported).toEqual(["keyRejected"]);
  });
});
