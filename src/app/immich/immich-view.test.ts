import { describe, expect, it } from "vitest";
import type { ImmichAlbum, ImmichPhoto } from "../../immich/immich-client";
import { photo } from "../../immich/testing/fake-immich-client";
import {
  sourcePick,
  sourceSpans,
  browseFailureMessages,
  filterByName,
  immichBox,
  immichSettings,
  alreadyInAmong,
  dayToggle,
  selectionSummary,
  type SourceMembership,
} from "./immich-view";
import { sourceKey } from "./browse-source";

/** An album's membership as far as its photos `ids` are known. */
function known(ids: readonly string[], complete: boolean): SourceMembership {
  return { photos: new Map(ids.map((id) => [id, photo(id)])), complete };
}

const alreadyInOf =
  (...ids: string[]) =>
  (candidate: ImmichPhoto): boolean =>
    ids.includes(candidate.id);

function album(id: string, name: string): ImmichAlbum {
  return { id, name, photoCount: 3, coverId: null, startDate: null, endDate: null };
}

describe("immichBox, the pictures step's Immich box", () => {
  it.each([
    [{ kind: "checking" }, { kind: "hidden" }],
    [{ kind: "notSetUp" }, { kind: "hidden" }],
    [
      { kind: "available", version: "3.3.1", albumCount: 4, missingPermissions: [] },
      { kind: "open" },
    ],
    [{ kind: "offline" }, { kind: "offline" }],
    [{ kind: "unreachable" }, { kind: "problem", problem: "unreachable" }],
    [{ kind: "keyRejected" }, { kind: "problem", problem: "keyRejected" }],
    [{ kind: "permissionMissing" }, { kind: "problem", problem: "permissionMissing" }],
    [{ kind: "signInExpired" }, { kind: "problem", problem: "signInExpired" }],
  ] as const)("is %o → %o", (state, expected) => {
    expect(immichBox(state)).toEqual(expected);
  });
});

describe("immichSettings, the settings' Immich group", () => {
  it.each([
    [{ kind: "checking" }, { kind: "checking" }],
    [{ kind: "notSetUp" }, { kind: "notSetUp" }],
    [
      { kind: "available", version: "3.3.1", albumCount: 4, missingPermissions: [] },
      { kind: "available", version: "3.3.1", albumCount: 4, missingPermissions: [] },
    ],
    [{ kind: "offline" }, { kind: "problem", problem: "offline", remedy: "checkAgain" }],
    [{ kind: "unreachable" }, { kind: "problem", problem: "unreachable", remedy: "checkAgain" }],
    [{ kind: "keyRejected" }, { kind: "problem", problem: "keyRejected", remedy: "checkAgain" }],
    [
      { kind: "permissionMissing" },
      { kind: "problem", problem: "permissionMissing", remedy: "checkAgain" },
    ],
    [{ kind: "signInExpired" }, { kind: "problem", problem: "signInExpired", remedy: "reload" }],
  ] as const)("is %o → %o", (state, expected) => {
    expect(immichSettings(state)).toEqual(expected);
  });
});

describe("filterByName", () => {
  const albums = [album("1", "Sommer am See"), album("2", "Lenas Taufe"), album("3", "Wandern")];

  it("keeps the albums whose name contains the filter, ignoring case and outer spaces", () => {
    expect(filterByName(albums, "  SEE ").map(({ id }) => id)).toEqual(["1"]);
  });

  it("keeps every album for an empty filter", () => {
    expect(filterByName(albums, " ")).toEqual(albums);
  });

  it("keeps none when no name matches", () => {
    expect(filterByName(albums, "Berge")).toEqual([]);
  });

  it("filters people the same way", () => {
    const people = [
      { id: "1", name: "Lena" },
      { id: "2", name: "Marco" },
    ];

    expect(filterByName(people, "mar")).toEqual([{ id: "2", name: "Marco" }]);
  });
});

describe("selectionSummary, the browser footer", () => {
  const spans = (albums: number, others: number) => ({ albums, others });

  it("asks for a pick while nothing is selected", () => {
    expect(selectionSummary(0, spans(0, 0))).toEqual({ kind: "hint" });
  });

  it("counts the selection and names the albums only when it spans more than one", () => {
    expect(selectionSummary(5, spans(1, 0))).toEqual({ kind: "count", count: 5, from: null });
    expect(selectionSummary(5, spans(2, 0))).toEqual({
      kind: "count",
      count: 5,
      from: { kind: "albums", count: 2 },
    });
  });

  it("names sources, albums counted among them, once a person or a folder is one of two or more", () => {
    expect(selectionSummary(5, spans(1, 1))).toEqual({
      kind: "count",
      count: 5,
      from: { kind: "sources", count: 2 },
    });
    expect(selectionSummary(5, spans(0, 3))).toEqual({
      kind: "count",
      count: 5,
      from: { kind: "sources", count: 3 },
    });
  });

  it("names no source for a single person or folder", () => {
    expect(selectionSummary(5, spans(0, 1))).toEqual({ kind: "count", count: 5, from: null });
  });
});

describe("alreadyInAmong", () => {
  const isIn = alreadyInAmong([
    { fileName: "beach.jpg", capturedAt: "2025-07-12T14:30:00Z", fileBytes: 1000 },
    { fileName: "x.jpg", capturedAt: "2020-01-01T00:00:00Z", immichAssetId: "asset-1" },
  ]);

  it("finds a photo by its asset id, or by file name and capture date", () => {
    expect(isIn(photo("asset-1"))).toBe(true);
    expect(
      isIn({
        id: "asset-9",
        fileName: "beach.jpg",
        takenAt: "2025-07-12T14:30:00Z",
        size: null,
      }),
    ).toBe(true);
  });

  it("passes a photo that is no picture there", () => {
    expect(isIn(photo("asset-2"))).toBe(false);
  });
});

describe("dayToggle, a day heading's button", () => {
  const day = [photo("a"), photo("b"), photo("c")];
  const nothingIn = alreadyInOf();

  it("selects the day until every photo of it is selected, then deselects it", () => {
    expect(dayToggle(day, (id) => id === "a", nothingIn)).toBe("select");
    expect(dayToggle(day, () => true, nothingIn)).toBe("deselect");
  });

  it("passes over the photos already in", () => {
    expect(dayToggle(day, (id) => id !== "c", alreadyInOf("c"))).toBe("deselect");
  });

  it("offers nothing on a day whose photos are all already in", () => {
    expect(dayToggle(day, () => false, alreadyInOf("a", "b", "c"))).toBeNull();
  });
});

describe("sourcePick, an album card's selection", () => {
  const complete = known(["a", "b"], true);
  const nothingIn = alreadyInOf();

  it("is nothing while none of the album's known photos is selected", () => {
    expect(sourcePick(complete, new Set(["x"]), nothingIn)).toEqual({
      selected: 0,
      all: false,
      alreadyIn: 0,
    });
    expect(sourcePick(undefined, new Set(["a"]), nothingIn)).toEqual({
      selected: 0,
      all: false,
      alreadyIn: 0,
    });
  });

  it("counts the album's selected photos", () => {
    expect(sourcePick(complete, new Set(["a", "x"]), nothingIn)).toEqual({
      selected: 1,
      all: false,
      alreadyIn: 0,
    });
  });

  it("is all once every photo of a fully known album is selected", () => {
    expect(sourcePick(complete, new Set(["a", "b"]), nothingIn)).toEqual({
      selected: 2,
      all: true,
      alreadyIn: 0,
    });
  });

  it("is all once every photo not already in is selected, and counts those already in", () => {
    expect(sourcePick(complete, new Set(["a"]), alreadyInOf("b"))).toEqual({
      selected: 1,
      all: true,
      alreadyIn: 1,
    });
  });

  it("is never all while the album is only partly known", () => {
    expect(sourcePick(known(["a"], false), new Set(["a"]), nothingIn)).toEqual({
      selected: 1,
      all: false,
      alreadyIn: 0,
    });
  });
});

describe("sourceSpans", () => {
  it("counts the albums and the other sources with at least one selected photo", () => {
    const membership = new Map<string, SourceMembership>([
      [sourceKey({ kind: "album", id: "lake" }), known(["a", "b"], true)],
      [sourceKey({ kind: "album", id: "hike" }), known(["c"], false)],
      [sourceKey({ kind: "album", id: "party" }), known(["d"], true)],
      [sourceKey({ kind: "person", id: "lena" }), known(["b", "e"], true)],
      [sourceKey({ kind: "folder", id: "Pictures" }), known(["f"], true)],
    ]);

    expect(sourceSpans(membership, new Set(["b", "c", "x"]))).toEqual({ albums: 2, others: 1 });
  });
});

describe("browseFailureMessages", () => {
  it.each([
    ["unexpected", "immich.notAnswering", "immich.notAnsweringText", "immich.notAnswering"],
    ["unreachable", "immich.notAnswering", "immich.notAnsweringText", "immich.notAnswering"],
    ["notSetUp", "immich.notAnswering", "immich.notAnsweringText", "immich.notAnswering"],
    ["offline", "immich.unusable", "immich.problemOffline", "immich.problemOffline"],
    ["keyRejected", "immich.unusable", "immich.problemKeyRejected", "immich.problemKeyRejected"],
    [
      "permissionMissing",
      "immich.unusable",
      "immich.problemPermissionMissing",
      "immich.problemPermissionMissing",
    ],
    [
      "signInExpired",
      "immich.unusable",
      "immich.problemSignInExpired",
      "immich.problemSignInExpired",
    ],
  ] as const)("tells a %s failure with %s, %s and the line %s", (failure, title, text, line) => {
    expect(browseFailureMessages(failure)).toEqual({ title, text, line });
  });
});
