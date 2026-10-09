import { describe, expect, it } from "vitest";
import type { ImmichAlbum } from "../../immich/immich-client";
import { photo } from "../../immich/testing/fake-immich-client";
import {
  albumPick,
  albumsWithSelection,
  filterAlbums,
  immichBox,
  immichSettings,
  isWholeDaySelected,
  selectionSummary,
  type AlbumMembership,
} from "./immich-view";

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

describe("isWholeDaySelected", () => {
  const day = [photo("a"), photo("b")];

  it("is true only when every photo of the day is selected", () => {
    expect(isWholeDaySelected(day, (id) => id === "a")).toBe(false);
    expect(isWholeDaySelected(day, () => true)).toBe(true);
  });
});

describe("albumPick, an album card's selection", () => {
  const complete: AlbumMembership = { photoIds: new Set(["a", "b"]), complete: true };

  it("is nothing while none of the album's known photos is selected", () => {
    expect(albumPick(complete, new Set(["x"]))).toEqual({ selected: 0, all: false });
    expect(albumPick(undefined, new Set(["a"]))).toEqual({ selected: 0, all: false });
  });

  it("counts the album's selected photos", () => {
    expect(albumPick(complete, new Set(["a", "x"]))).toEqual({ selected: 1, all: false });
  });

  it("is all once every photo of a fully known album is selected", () => {
    expect(albumPick(complete, new Set(["a", "b"]))).toEqual({ selected: 2, all: true });
  });

  it("is never all while the album is only partly known", () => {
    const partial: AlbumMembership = { photoIds: new Set(["a"]), complete: false };
    expect(albumPick(partial, new Set(["a"]))).toEqual({ selected: 1, all: false });
  });
});

describe("albumsWithSelection", () => {
  it("counts the albums with at least one selected photo", () => {
    const membership = new Map<string, AlbumMembership>([
      ["lake", { photoIds: new Set(["a", "b"]), complete: true }],
      ["hike", { photoIds: new Set(["c"]), complete: false }],
      ["party", { photoIds: new Set(["d"]), complete: true }],
    ]);

    expect(albumsWithSelection(membership, new Set(["b", "c", "x"]))).toBe(2);
  });
});
