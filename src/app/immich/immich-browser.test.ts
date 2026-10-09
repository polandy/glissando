import { describe, expect, it } from "vitest";
import {
  ImmichUnavailableError,
  type ImmichAlbum,
  type ImmichUnavailableKind,
} from "../../immich/immich-client";
import { FakeImmichClient, photo } from "../../immich/testing/fake-immich-client";
import { ImmichBrowser, type ImmichBrowserState } from "./immich-browser";

const LAKE: ImmichAlbum = {
  id: "lake",
  name: "Lake",
  photoCount: 3,
  coverId: "p1",
  startDate: "2025-07-12T10:00:00.000Z",
  endDate: "2025-07-13T10:00:00.000Z",
};

function browserWith(client: FakeImmichClient) {
  const reported: ImmichUnavailableKind[] = [];
  const browser = new ImmichBrowser({ client, reportUnavailable: (kind) => reported.push(kind) });
  const states: ImmichBrowserState[] = [];
  browser.subscribe((state) => states.push(state));
  return { browser, latest: () => browser.state, states, reported };
}

describe("ImmichBrowser", () => {
  it("starts on All photos and keeps the tab the user chose", () => {
    const { browser } = browserWith(new FakeImmichClient());
    expect(browser.state.tab).toBe("photos");

    browser.showTab("albums");

    expect(browser.state.tab).toBe("albums");
  });

  it("loads the albums once, however often the tab opens", async () => {
    const client = new FakeImmichClient();
    client.albumList = [LAKE];
    const { browser } = browserWith(client);

    await browser.loadAlbums();
    await browser.loadAlbums();

    expect(browser.state.albums).toEqual([LAKE]);
    expect(client.albumsCalls).toBe(1);
  });

  it("fails the albums with the problem Immich met, reports it, and loads them again on retry", async () => {
    const client = new FakeImmichClient();
    client.albumsError = new ImmichUnavailableError("keyRejected");
    const { browser, reported } = browserWith(client);

    await browser.loadAlbums();
    expect(browser.state.albumsFailure).toBe("keyRejected");
    expect(reported).toEqual(["keyRejected"]);

    client.albumsError = null;
    client.albumList = [LAKE];
    await browser.retryAlbums();

    expect(browser.state).toMatchObject({ albums: [LAKE], albumsFailure: null });
  });

  it("reports the problem a feed meets", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push(new ImmichUnavailableError("permissionMissing"));
    const { browser, reported } = browserWith(client);

    await browser.library.loadMore();

    expect(browser.library.state.failure).toBe("permissionMissing");
    expect(reported).toEqual(["permissionMissing"]);
  });

  it("gives one feed per album and learns the album's photos from its pages", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push({ photos: [photo("p1"), photo("p2")], nextPage: null });
    const { browser } = browserWith(client);

    const feed = browser.albumFeed("lake");
    await feed.loadMore();

    expect(browser.albumFeed("lake")).toBe(feed);
    expect(client.photoQueries).toEqual([{ page: 1, albumId: "lake" }]);
    expect(browser.state.membership.get("lake")).toEqual({
      photoIds: new Set(["p1", "p2"]),
      complete: true,
    });
  });

  it("selects a whole album page by page, busy meanwhile, and deselects it on the next toggle", async () => {
    const client = new FakeImmichClient();
    const firstPage = client.holdPhotos();
    client.photoAnswers.push({ photos: [photo("p3")], nextPage: null });
    const { browser } = browserWith(client);

    const selecting = browser.toggleAlbum("lake");
    expect(browser.state.busyAlbumIds.has("lake")).toBe(true);
    firstPage({ photos: [photo("p1"), photo("p2")], nextPage: 2 });
    await selecting;

    expect(browser.state.busyAlbumIds.has("lake")).toBe(false);
    expect(browser.selection.photos().map(({ id }) => id)).toEqual(["p1", "p2", "p3"]);
    expect(browser.state.membership.get("lake")?.complete).toBe(true);

    await browser.toggleAlbum("lake");

    expect(browser.selection.count).toBe(0);
  });

  it("keeps the selection, the albums and the grid when a whole album cannot be read, failing that album only", async () => {
    const client = new FakeImmichClient();
    client.albumList = [LAKE];
    client.photoAnswers.push(new ImmichUnavailableError("offline"));
    const { browser, reported } = browserWith(client);
    await browser.loadAlbums();
    browser.selection.toggle(photo("kept"));

    await browser.toggleAlbum("lake");

    expect(browser.selection.photos().map(({ id }) => id)).toEqual(["kept"]);
    expect(browser.state).toMatchObject({ albums: [LAKE], albumsFailure: null });
    expect(browser.state.albumFailures.get("lake")).toBe("offline");
    expect(browser.state.busyAlbumIds.size).toBe(0);
    expect(reported).toEqual(["offline"]);
  });

  it("clears an album's failure when its whole-album select is tried again", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push(new ImmichUnavailableError("unreachable"), {
      photos: [photo("p1")],
      nextPage: null,
    });
    const { browser } = browserWith(client);
    await browser.toggleAlbum("lake");

    await browser.toggleAlbum("lake");

    expect(browser.state.albumFailures.has("lake")).toBe(false);
    expect(browser.selection.photos().map(({ id }) => id)).toEqual(["p1"]);
  });

  it("ignores a toggle of an album while its whole-album fetch is under way", async () => {
    const client = new FakeImmichClient();
    const answer = client.holdPhotos();
    const { browser } = browserWith(client);
    const selecting = browser.toggleAlbum("lake");

    await browser.toggleAlbum("lake");
    answer({ photos: [photo("p1"), photo("p2")], nextPage: null });
    await selecting;

    expect(client.photoQueries).toEqual([{ page: 1, albumId: "lake" }]);
    expect(browser.selection.photos().map(({ id }) => id)).toEqual(["p1", "p2"]);
  });

  it("keeps a photo deselected while its album's whole-album fetch was under way deselected", async () => {
    const client = new FakeImmichClient();
    const answer = client.holdPhotos();
    const { browser } = browserWith(client);
    browser.selection.toggle(photo("p1"));
    const selecting = browser.toggleAlbum("lake");

    browser.selection.toggle(photo("p1"));
    answer({ photos: [photo("p1"), photo("p2")], nextPage: null });
    await selecting;

    expect(browser.selection.photos().map(({ id }) => id)).toEqual(["p2"]);
  });
});
