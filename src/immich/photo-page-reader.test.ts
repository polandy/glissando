import { describe, expect, it } from "vitest";
import { ImmichJsonReader } from "./immich-json";
import { isJpegAsset, readFolderPage, readPhotoPage } from "./photo-page-reader";

const reader = () => new ImmichJsonReader("POST api/search/metadata");

function asset(
  id: string,
  fileName: string,
  mimeType: string | null | undefined,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    type: "IMAGE",
    originalFileName: fileName,
    ...(mimeType === undefined ? {} : { originalMimeType: mimeType }),
    localDateTime: "2025-07-12T14:30:00.000Z",
    ...extra,
  };
}

const search = (items: unknown[], nextPage: string | null = null) => ({
  assets: { items, nextPage },
});

describe("isJpegAsset", () => {
  it.each([
    ["image/jpeg", "a.heic"],
    ["image/jpg", "a.png"],
    ["image/pjpeg", "a.png"],
    ["IMAGE/JPEG", "a.png"],
    [null, "a.jpg"],
    [null, "a.jpeg"],
    [null, "a.jpe"],
    [null, "a.jfif"],
    [null, "A.JPG"],
    [null, "photo.final.JpEg"],
    ["", "a.jpg"],
  ])("lists MIME type %j of %s", (mimeType, fileName) => {
    expect(isJpegAsset(mimeType, fileName)).toBe(true);
  });

  it.each([
    ["image/heic", "a.jpg"],
    ["image/heif", "a.jpg"],
    ["image/png", "a.png"],
    ["image/webp", "a.webp"],
    ["image/avif", "a.avif"],
    ["image/gif", "a.gif"],
    ["image/tiff", "a.tif"],
    ["image/x-adobe-dng", "a.dng"],
    [null, "a.heic"],
    [null, "a.dng"],
    [null, "a.png"],
    [null, "jpg"],
    [null, "a.jpg.png"],
    [null, ""],
  ])("hides MIME type %j of %s", (mimeType, fileName) => {
    expect(isJpegAsset(mimeType, fileName)).toBe(false);
  });
});

describe("readPhotoPage", () => {
  it("lists JPEGs and counts every other image as hidden by its wall time", () => {
    const answer = search([
      asset("jpeg", "a.jpg", "image/jpeg"),
      asset("heic", "b.heic", "image/heic", { localDateTime: "2025-07-11T08:00:00.000Z" }),
      asset("dng", "c.dng", "image/x-adobe-dng", { localDateTime: "2025-07-10T08:15:30.250Z" }),
    ]);

    const page = readPhotoPage(reader(), answer, false);

    expect(page.photos.map(({ id }) => id)).toEqual(["jpeg"]);
    expect(page.hiddenTakenAt).toEqual(["2025-07-11T08:00:00Z", "2025-07-10T08:15:30Z"]);
  });

  it("judges an asset with no MIME type by its file name", () => {
    const answer = search([
      asset("absent", "a.JPG", undefined),
      asset("null", "b.jpeg", null),
      asset("empty", "c.jpe", ""),
      asset("heic", "d.HEIC", null),
    ]);

    const page = readPhotoPage(reader(), answer, false);

    expect(page.photos.map(({ id }) => id)).toEqual(["absent", "null", "empty"]);
    expect(page.hiddenTakenAt).toHaveLength(1);
  });

  it("lists a RAW and JPEG pair once, as its JPEG", () => {
    const answer = search([
      asset("raw", "IMG_1.dng", "image/x-adobe-dng"),
      asset("jpeg", "IMG_1.jpg", "image/jpeg"),
    ]);

    const page = readPhotoPage(reader(), answer, false);

    expect(page.photos.map(({ id }) => id)).toEqual(["jpeg"]);
    expect(page.hiddenTakenAt).toEqual(["2025-07-12T14:30:00Z"]);
  });

  it("lists a video as before, with no hidden count, only when asked", () => {
    const video = asset("clip", "clip.mov", "video/quicktime", { type: "VIDEO" });

    expect(readPhotoPage(reader(), search([video]), true).photos.map(({ id }) => id)).toEqual([
      "clip",
    ]);
    const without = readPhotoPage(reader(), search([video]), false);
    expect(without.photos).toEqual([]);
    expect(without.hiddenTakenAt).toEqual([]);
  });

  it("passes the next page on", () => {
    expect(readPhotoPage(reader(), search([], "3"), false).nextPage).toBe(3);
  });
});

describe("readFolderPage", () => {
  it("reads a plain array through the same rule, with no next page", () => {
    const answer = [asset("jpeg", "a.jpg", "image/jpeg"), asset("heic", "b.heic", "image/heic")];

    const page = readFolderPage(new ImmichJsonReader("GET api/view/folder"), answer, false);

    expect(page.photos.map(({ id }) => id)).toEqual(["jpeg"]);
    expect(page.hiddenTakenAt).toHaveLength(1);
    expect(page.nextPage).toBeNull();
  });

  it("fails loud on an answer that is not an array", () => {
    expect(() => readFolderPage(reader(), { assets: [] }, false)).toThrow(/not an array/);
  });
});
