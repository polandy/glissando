import { describe, expect, it } from "vitest";
import { ImmichUnavailableError, type ImmichPhoto } from "./immich-client";
import { allAlbumPhotos, PhotoSelection } from "./photo-selection";
import { FakeImmichClient, photo } from "./testing/fake-immich-client";

const A = photo("a");
const B = photo("b");
const C = photo("c");

function setUp() {
  const selection = new PhotoSelection();
  const seen: (readonly ImmichPhoto[])[] = [];
  selection.subscribe((photos) => seen.push(photos));
  return { selection, seen };
}

describe("PhotoSelection", () => {
  it("starts empty and tells a subscriber at once", () => {
    const { selection, seen } = setUp();

    expect(selection.count).toBe(0);
    expect(seen).toEqual([[]]);
  });

  it("toggles a photo in and out, publishing each change", () => {
    const { selection, seen } = setUp();

    selection.toggle(A);
    expect(selection.has("a")).toBe(true);
    selection.toggle(A);

    expect(selection.has("a")).toBe(false);
    expect(seen).toEqual([[], [A], []]);
  });

  it("keeps the order photos were selected in, with their data", () => {
    const { selection } = setUp();

    selection.toggle(B);
    selection.toggle(A);

    expect(selection.photos()).toEqual([B, A]);
  });

  it("knows a photo by id, whichever object carries it", () => {
    const { selection } = setUp();
    selection.toggle(A);

    selection.toggle({ ...A });

    expect(selection.count).toBe(0);
  });

  it("selects all of a group once, adding only what is missing", () => {
    const { selection } = setUp();
    selection.toggle(B);

    selection.selectAll([A, B, C]);

    expect(selection.photos()).toEqual([B, A, C]);
  });

  it("deselects all of a group, leaving the rest", () => {
    const { selection } = setUp();
    selection.selectAll([A, B, C]);

    selection.deselectAll([A, C]);

    expect(selection.photos()).toEqual([B]);
  });

  it("does not publish a change that changes nothing", () => {
    const { selection, seen } = setUp();
    selection.selectAll([A]);

    selection.selectAll([A]);
    selection.deselectAll([B]);

    expect(seen).toEqual([[], [A]]);
  });

  it("clears everything", () => {
    const { selection } = setUp();
    selection.selectAll([A, B]);

    selection.clear();

    expect(selection.photos()).toEqual([]);
  });
});

describe("PhotoSelection, extending to a photo (shift-click)", () => {
  const D = photo("d");
  const E = photo("e");
  const SHOWN = [A, B, C, D, E];

  it("selects every photo from the last toggled one to this one, either direction", () => {
    const forward = new PhotoSelection();
    forward.toggle(B);
    forward.extendTo(D, SHOWN);
    expect(forward.photos().map(({ id }) => id)).toEqual(["b", "c", "d"]);

    const backward = new PhotoSelection();
    backward.toggle(D);
    backward.extendTo(B, SHOWN);
    expect(backward.photos().map(({ id }) => id)).toEqual(["d", "c", "b"]);
  });

  it("deselects the range when the last toggle deselected", () => {
    const selection = new PhotoSelection();
    selection.selectAll(SHOWN);
    selection.toggle(B);

    selection.extendTo(D, SHOWN);

    expect(selection.photos().map(({ id }) => id)).toEqual(["a", "e"]);
  });

  it("keeps its anchor, so a second shift-click re-aims the range from it", () => {
    const selection = new PhotoSelection();
    selection.toggle(C);
    selection.extendTo(E, SHOWN);

    selection.extendTo(A, SHOWN);

    expect(selection.has("a") && selection.has("b") && selection.has("c")).toBe(true);
    expect(selection.has("e")).toBe(true);
  });

  it("toggles just this photo without an anchor, or with one not shown", () => {
    const fresh = new PhotoSelection();
    fresh.extendTo(C, SHOWN);
    expect(fresh.photos()).toEqual([C]);

    const elsewhere = new PhotoSelection();
    elsewhere.toggle(photo("x"));
    elsewhere.extendTo(C, SHOWN);
    expect(elsewhere.photos().map(({ id }) => id)).toEqual(["x", "c"]);
  });

  it("forgets its anchor when cleared", () => {
    const selection = new PhotoSelection();
    selection.toggle(A);
    selection.clear();

    selection.extendTo(C, SHOWN);

    expect(selection.photos()).toEqual([C]);
  });
});

describe("allAlbumPhotos", () => {
  it("pages through an album until the last page", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push({ photos: [A, B], nextPage: 2 }, { photos: [C], nextPage: null });

    const photos = await allAlbumPhotos(client, "album-1");

    expect(photos).toEqual([A, B, C]);
    expect(client.photoQueries).toEqual([
      { page: 1, albumId: "album-1" },
      { page: 2, albumId: "album-1" },
    ]);
  });

  it("rejects when a page fails", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push({ photos: [A], nextPage: 2 }, new ImmichUnavailableError("offline"));

    await expect(allAlbumPhotos(client, "album-1")).rejects.toBeInstanceOf(ImmichUnavailableError);
  });
});
