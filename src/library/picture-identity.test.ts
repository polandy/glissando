import { describe, expect, it } from "vitest";
import { isSamePicture, type PictureIdentity } from "./picture-identity";

const AT = "2025-07-12T10:30:15Z";
const file = (fileName: string, capturedAt: string, fileBytes?: number): PictureIdentity => ({
  fileName,
  capturedAt,
  ...(fileBytes === undefined ? {} : { fileBytes }),
});
const immich = (immichAssetId: string, fileName = "IMG_1.jpg"): PictureIdentity => ({
  fileName,
  capturedAt: AT,
  immichAssetId,
});

describe("isSamePicture (ADR-0016)", () => {
  it.each([
    ["two Immich photos with the same asset id", true, immich("a1"), immich("a1")],
    [
      "two Immich photos with different asset ids, even with the same name and date",
      false,
      immich("a1"),
      immich("a2"),
    ],
    [
      "two files with the same name, capture date and size",
      true,
      file("IMG_1.jpg", AT, 900),
      file("IMG_1.jpg", AT, 900),
    ],
    [
      "two files with the same name and date but different sizes",
      false,
      file("IMG_1.jpg", AT, 900),
      file("IMG_1.jpg", AT, 901),
    ],
    [
      "two files with different names",
      false,
      file("IMG_1.jpg", AT, 900),
      file("IMG_2.jpg", AT, 900),
    ],
    [
      "two files with different capture dates",
      false,
      file("IMG_1.jpg", AT, 900),
      file("IMG_1.jpg", "2025-07-12T10:30:16Z", 900),
    ],
    [
      "a picture without an origin and a file by name and date",
      true,
      file("IMG_1.jpg", AT),
      file("IMG_1.jpg", AT, 900),
    ],
    ["an Immich photo and a file by name and date", true, immich("a1"), file("IMG_1.jpg", AT, 900)],
    [
      "an Immich photo and a file with another name",
      false,
      immich("a1"),
      file("IMG_9.jpg", AT, 900),
    ],
  ])("%s → same: %s", (_case, same, a, b) => {
    expect(isSamePicture(a, b)).toBe(same);
    expect(isSamePicture(b, a)).toBe(same);
  });
});
