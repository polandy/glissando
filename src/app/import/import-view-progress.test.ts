import { describe, expect, it } from "vitest";
import type { ImportPick, PictureImportState } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import type { Translator } from "../i18n/translator";
import type { CullingState } from "./picture-culling";
import { continueBlockedReason, continueBlockedText, pickProgress } from "./import-view";

/** Enough of a translator to prove `continueBlockedText` picks the right key and count. */
const t = ((key: string, args?: { readonly count: number }) => {
  if (key === "import.blockedImporting") return `${args?.count} left to import`;
  if (key === "import.blockedChecking") return "checking …";
  throw new Error(`continueBlockedText asked for an unexpected key "${key}"`);
}) as Translator["t"];

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

describe("continueBlockedText", () => {
  it("names how many pictures are left while importing", () => {
    expect(continueBlockedText({ kind: "importing", remaining: 3 }, t)).toBe("3 left to import");
  });

  it("says checking while the cull runs", () => {
    expect(continueBlockedText({ kind: "checking" }, t)).toBe("checking …");
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
