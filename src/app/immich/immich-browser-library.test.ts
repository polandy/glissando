import { describe, expect, it } from "vitest";
import { WHOLE_LIBRARY } from "../../immich/immich-client";
import { FakeImmichClient } from "../../immich/testing/fake-immich-client";
import { monthEnd } from "../../immich/timeline";
import { ImmichBrowser } from "./immich-browser";

function setUp() {
  const client = new FakeImmichClient();
  const browser = new ImmichBrowser({ client, reportUnavailable: () => undefined });
  return { client, browser };
}

describe("ImmichBrowser, the library feed", () => {
  it("starts on the whole library, newest first, without favourites or month", () => {
    const { browser } = setUp();

    expect(browser.state).toMatchObject({ favourites: false, month: null });
    expect(browser.library.state.photos).toEqual([]);
  });

  it("restricts the feed to favourites and back, keeping each feed with what it read", async () => {
    const { client, browser } = setUp();
    client.photoAnswers.push({ photos: [], nextPage: null }, { photos: [], nextPage: null });
    const everything = browser.library;
    await everything.loadMore();

    browser.setFavourites(true);
    await browser.library.loadMore();
    browser.setFavourites(false);

    expect(browser.library).toBe(everything);
    expect(browser.state.favourites).toBe(false);
    expect(client.photoQueries.map(({ source }) => source)).toEqual([
      WHOLE_LIBRARY,
      { kind: "library", favoritesOnly: true, takenBefore: null },
    ]);
  });

  it("restarts the feed at the end of the picked month", async () => {
    const { client, browser } = setUp();
    client.photoAnswers.push({ photos: [], nextPage: null });

    browser.jumpToMonth("2025-07");
    await browser.library.loadMore();

    expect(browser.state.month).toBe("2025-07");
    expect(client.photoQueries[0]?.source).toEqual({
      kind: "library",
      favoritesOnly: false,
      takenBefore: monthEnd("2025-07"),
    });
  });

  it("combines favourites and month, one feed per combination", async () => {
    const { client, browser } = setUp();
    client.photoAnswers.push({ photos: [], nextPage: null });

    browser.setFavourites(true);
    browser.jumpToMonth("2025-07");
    const both = browser.library;
    await both.loadMore();
    browser.jumpToMonth(null);
    browser.jumpToMonth("2025-07");

    expect(browser.library).toBe(both);
    expect(client.photoQueries[0]?.source).toEqual({
      kind: "library",
      favoritesOnly: true,
      takenBefore: monthEnd("2025-07"),
    });
  });

  it("publishes the change so the view follows", () => {
    const { browser } = setUp();
    const seen: (string | null)[] = [];
    browser.subscribe((state) => seen.push(state.month));

    browser.jumpToMonth("2025-07");
    browser.jumpToMonth("2025-07");

    expect(seen).toEqual([null, "2025-07"]);
  });
});
