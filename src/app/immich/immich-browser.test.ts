import { describe, expect, it } from "vitest";
import { ImmichUnavailableError, type ImmichAlbum } from "../../immich/immich-client";
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
  const browser = new ImmichBrowser({ client });
  const states: ImmichBrowserState[] = [];
  browser.subscribe((state) => states.push(state));
  return { browser, latest: () => browser.state, states };
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

  it("marks the albums failed when Immich is unavailable, and loads them again on retry", async () => {
    const client = new FakeImmichClient();
    client.albumsError = new ImmichUnavailableError("unreachable");
    const { browser } = browserWith(client);

    await browser.loadAlbums();
    expect(browser.state.albumsFailed).toBe(true);

    client.albumsError = null;
    client.albumList = [LAKE];
    await browser.retryAlbums();

    expect(browser.state).toMatchObject({ albums: [LAKE], albumsFailed: false });
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

  it("keeps the selection and marks the albums failed when a whole album cannot be read", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push(new ImmichUnavailableError("offline"));
    const { browser } = browserWith(client);
    browser.selection.toggle(photo("kept"));

    await browser.toggleAlbum("lake");

    expect(browser.selection.photos().map(({ id }) => id)).toEqual(["kept"]);
    expect(browser.state.albumsFailed).toBe(true);
    expect(browser.state.busyAlbumIds.size).toBe(0);
  });
});
