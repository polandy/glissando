import { describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import { FakeImmichClient, photo } from "../../immich/testing/fake-immich-client";
import { sourceKey, type BrowseSource } from "./browse-source";
import { ImmichBrowser } from "./immich-browser";

const LENA: BrowseSource = { kind: "person", id: "p1" };
const CAMERA: BrowseSource = { kind: "folder", id: "Pictures/Camera" };

function setUp() {
  const client = new FakeImmichClient();
  const browser = new ImmichBrowser({ client, reportUnavailable: () => undefined });
  return { client, browser };
}

const selectedIds = (browser: ImmichBrowser) => browser.selection.photos().map(({ id }) => id);

describe("ImmichBrowser, whole-source select for people and folders", () => {
  it("asks Immich for the person's and the folder's photos", async () => {
    const { client, browser } = setUp();
    client.photoAnswers.push({ photos: [], nextPage: null }, { photos: [], nextPage: null });

    await browser.sourceFeed(LENA).loadMore();
    await browser.sourceFeed(CAMERA).loadMore();

    expect(client.photoQueries.map(({ source }) => source)).toEqual([
      { kind: "person", personId: "p1" },
      { kind: "folder", path: "Pictures/Camera" },
    ]);
  });

  it("keeps an album, a person and a folder of the same id apart", () => {
    const { browser } = setUp();

    const album = browser.sourceFeed({ kind: "album", id: "x" });
    const person = browser.sourceFeed({ kind: "person", id: "x" });

    expect(person).not.toBe(album);
    expect(sourceKey({ kind: "album", id: "x" })).not.toBe(sourceKey({ kind: "person", id: "x" }));
  });

  it("selects every picture of a person page by page and deselects them on the next toggle", async () => {
    const { client, browser } = setUp();
    client.photoAnswers.push(
      { photos: [photo("a")], nextPage: 2 },
      { photos: [photo("b")], nextPage: null },
    );

    await browser.toggleSource(LENA);
    expect(selectedIds(browser)).toEqual(["a", "b"]);
    expect(browser.state.membership.get(sourceKey(LENA))?.complete).toBe(true);

    await browser.toggleSource(LENA);
    expect(browser.selection.count).toBe(0);
  });

  it("selects a folder's pictures, passing over those already in", async () => {
    const { client, browser } = setUp();
    client.photoAnswers.push({ photos: [photo("a"), photo("in")], nextPage: null });

    await browser.toggleSource(CAMERA, ({ id }) => id === "in");

    expect(selectedIds(browser)).toEqual(["a"]);
  });

  it("keeps a picture deselected meanwhile deselected", async () => {
    const { client, browser } = setUp();
    const answer = client.holdPhotos();
    browser.selection.toggle(photo("a"));
    const selecting = browser.toggleSource(LENA);

    browser.selection.toggle(photo("a"));
    answer({ photos: [photo("a"), photo("b")], nextPage: null });
    await selecting;

    expect(selectedIds(browser)).toEqual(["b"]);
  });

  it("fails one source only, naming its problem, and tries again on the next toggle", async () => {
    const { client, browser } = setUp();
    client.photoAnswers.push(new ImmichUnavailableError("unreachable"), {
      photos: [photo("a")],
      nextPage: null,
    });

    await browser.toggleSource(LENA);
    expect(browser.state.sourceFailures.get(sourceKey(LENA))).toBe("unreachable");
    expect(browser.state.sourceFailures.has(sourceKey(CAMERA))).toBe(false);
    expect(browser.state.busySources.size).toBe(0);

    await browser.toggleSource(LENA);

    expect(browser.state.sourceFailures.size).toBe(0);
    expect(selectedIds(browser)).toEqual(["a"]);
  });

  it("ignores a toggle of a source while its fetch is under way", async () => {
    const { client, browser } = setUp();
    const answer = client.holdPhotos();
    const selecting = browser.toggleSource(CAMERA);
    expect(browser.state.busySources.has(sourceKey(CAMERA))).toBe(true);

    await browser.toggleSource(CAMERA);
    answer({ photos: [photo("a")], nextPage: null });
    await selecting;

    expect(client.photoQueries).toHaveLength(1);
    expect(selectedIds(browser)).toEqual(["a"]);
  });
});
