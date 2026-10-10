import { describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { slideshowStorage } from "./slideshow-storage";

const picture = (id: string, immichAssetId?: string): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  width: 3,
  height: 2,
  fileName: `${id}.jpg`,
  ...(immichAssetId === undefined ? {} : { immichAssetId }),
});

const slideshow = (pictures: StoredPicture[]): StoredSlideshow => ({
  id: "show",
  title: "July",
  createdAt: "2025-07-02T08:00:00Z",
  pictures,
  secondsPerPicture: 5,
});

const MIXED = slideshow([picture("a", "asset-a"), picture("b", "asset-b"), picture("c")]);

describe("where the slideshow screen says a slideshow lives", () => {
  it("says nothing of a device slideshow while the server library is off", () => {
    expect(
      slideshowStorage("device", MIXED, { serverOn: false, saving: false, missingCount: 0 }),
    ).toBeNull();
  });

  it("counts a device slideshow's pictures from Immich and from the device while it is on", () => {
    expect(
      slideshowStorage("device", MIXED, { serverOn: true, saving: false, missingCount: 0 }),
    ).toEqual({ kind: "device", fromImmich: 2, fromDevice: 1 });
  });

  it("tells a server slideshow's saving and missing pictures, on or not", () => {
    expect(
      slideshowStorage("server", MIXED, { serverOn: false, saving: true, missingCount: 2 }),
    ).toEqual({ kind: "server", saving: true, missingCount: 2 });
  });
});
