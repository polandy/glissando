import { describe, expect, it } from "vitest";
import type { ImmichAlbum, ImmichPhoto } from "../../immich/immich-client";
import { photo } from "../../immich/testing/fake-immich-client";
import {
  albumPick,
  albumsWithSelection,
  browseFailureMessages,
  filterAlbums,
  immichBox,
  immichSettings,
  alreadyInAmong,
  dayToggle,
  selectionSummary,
  type AlbumMembership,
} from "./immich-view";

/** An album's membership as far as its photos `ids` are known. */
function known(ids: readonly string[], complete: boolean): AlbumMembership {
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
    [{ kind: "available", version: "3.3.1", albumCount: 4 }, { kind: "open" }],
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
      { kind: "available", version: "3.3.1", albumCount: 4 },
      { kind: "available", version: "3.3.1", albumCount: 4 },
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

describe("filterAlbums", () => {
  const albums = [album("1", "Sommer am See"), album("2", "Lenas Taufe"), album("3", "Wandern")];

  it("keeps the albums whose name contains the filter, ignoring case and outer spaces", () => {
    expect(filterAlbums(albums, "  SEE ").map(({ id }) => id)).toEqual(["1"]);
  });

  it("keeps every album for an empty filter", () => {
    expect(filterAlbums(albums, " ")).toEqual(albums);
  });

  it("keeps none when no name matches", () => {
    expect(filterAlbums(albums, "Berge")).toEqual([]);
  });
});

describe("selectionSummary, the browser footer", () => {
  it("asks for a pick while nothing is selected", () => {
    expect(selectionSummary(0, 0)).toEqual({ kind: "hint" });
  });

  it("counts the selection and names the albums only when it spans more than one", () => {
    expect(selectionSummary(5, 1)).toEqual({ kind: "count", count: 5, albums: null });
    expect(selectionSummary(5, 2)).toEqual({ kind: "count", count: 5, albums: 2 });
  });
});

describe("alreadyInAmong", () => {
  const isIn = alreadyInAmong([
    { fileName: "beach.jpg", capturedAt: "2025-07-12T14:30:00.000Z", fileBytes: 1000 },
    { fileName: "x.jpg", capturedAt: "2020-01-01T00:00:00Z", immichAssetId: "asset-1" },
  ]);

  it("finds a photo by its asset id, or by file name and capture date", () => {
    expect(isIn(photo("asset-1"))).toBe(true);
    expect(
      isIn({ id: "asset-9", fileName: "beach.jpg", takenAt: "2025-07-12T14:30:00.000Z" }),
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

describe("albumPick, an album card's selection", () => {
  const complete = known(["a", "b"], true);
  const nothingIn = alreadyInOf();

  it("is nothing while none of the album's known photos is selected", () => {
    expect(albumPick(complete, new Set(["x"]), nothingIn)).toEqual({
      selected: 0,
      all: false,
      alreadyIn: 0,
    });
    expect(albumPick(undefined, new Set(["a"]), nothingIn)).toEqual({
      selected: 0,
      all: false,
      alreadyIn: 0,
    });
  });

  it("counts the album's selected photos", () => {
    expect(albumPick(complete, new Set(["a", "x"]), nothingIn)).toEqual({
      selected: 1,
      all: false,
      alreadyIn: 0,
    });
  });

  it("is all once every photo of a fully known album is selected", () => {
    expect(albumPick(complete, new Set(["a", "b"]), nothingIn)).toEqual({
      selected: 2,
      all: true,
      alreadyIn: 0,
    });
  });

  it("is all once every photo not already in is selected, and counts those already in", () => {
    expect(albumPick(complete, new Set(["a"]), alreadyInOf("b"))).toEqual({
      selected: 1,
      all: true,
      alreadyIn: 1,
    });
  });

  it("is never all while the album is only partly known", () => {
    expect(albumPick(known(["a"], false), new Set(["a"]), nothingIn)).toEqual({
      selected: 1,
      all: false,
      alreadyIn: 0,
    });
  });
});

describe("albumsWithSelection", () => {
  it("counts the albums with at least one selected photo", () => {
    const membership = new Map<string, AlbumMembership>([
      ["lake", known(["a", "b"], true)],
      ["hike", known(["c"], false)],
      ["party", known(["d"], true)],
    ]);

    expect(albumsWithSelection(membership, new Set(["b", "c", "x"]))).toBe(2);
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
