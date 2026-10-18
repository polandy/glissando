import { describe, expect, it } from "vitest";
import type { ImportPick, PictureImportState } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import type { CullingState } from "./picture-culling";
import { continueBlockedReason, pickProgress } from "./import-view";

const picture = (id: string, capturedAt: string): StoredPicture => ({
  id,
  capturedAt,
  width: 300,
  height: 200,
  fileName: `${id}.jpg`,
  colours: { veil: "#404040", accent: "#C0C0C0" },
});

const oneStored: PictureImportState = {
  total: 1,
  done: 1,
  pictures: [picture("a", "2025-07-01T10:00:00Z")],
  picks: [],
  skipped: [],
  storageFull: false,
  busy: false,
  failed: false,
};
const culled: CullingState = { checking: null, groups: [], setAsideCount: 0 };

describe("continueBlockedReason", () => {
  it("names the remaining count while files are being imported", () => {
    expect(continueBlockedReason({ ...oneStored, total: 4, done: 1, busy: true }, culled)).toEqual({
      kind: "importing",
      remaining: 3,
    });
  });

  it("is checking once the import is idle but the cull is not done", () => {
    expect(
      continueBlockedReason(oneStored, { ...culled, checking: { checked: 0, total: 1 } }),
    ).toEqual({ kind: "checking" });
  });

  it("is null once nothing blocks continuing", () => {
    expect(continueBlockedReason(oneStored, culled)).toBeNull();
  });
});

describe("pickProgress", () => {
  const pick = (id: string, total: number, done: number): ImportPick => ({
    id,
    kind: "files",
    total,
    done,
    stored: done,
  });

  it("marks the earliest unfinished pick as the one in flight", () => {
    const picks = [pick("p1", 2, 2), pick("p2", 3, 1), pick("p3", 1, 0)];

    expect(pickProgress(picks)).toEqual([
      { pick: picks[0], inFlight: false },
      { pick: picks[1], inFlight: true },
      { pick: picks[2], inFlight: false },
    ]);
  });

  it("marks none in flight once every pick is finished", () => {
    const picks = [pick("p1", 1, 1)];

    expect(pickProgress(picks)).toEqual([{ pick: picks[0], inFlight: false }]);
  });
});
