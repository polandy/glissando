import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import { FakeImmichClient, photo } from "../../immich/testing/fake-immich-client";
import { destroyRoutes, LAKE, mountRoute, until } from "./testing/immich-route-harness";

afterEach(() => destroyRoutes());

describe("ImmichRoute, All photos", () => {
  it("loads the next page when the end comes into view, and says when all are there", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push(
      { photos: [photo("a")], nextPage: 2 },
      { photos: [photo("b", "2025-07-11T09:00:00.000Z")], nextPage: null },
    );
    const { browser, target, end } = mountRoute(client);
    expect(end.watched()).toBe(1);

    end.reachEnd();
    await until(browser.library, (state) => state.photos.length === 1 && !state.loading);
    flushSync();
    expect(target.querySelectorAll(".ph")).toHaveLength(1);

    end.reachEnd();
    await until(browser.library, (state) => state.done);
    flushSync();

    expect(client.photoQueries).toEqual([{ page: 1 }, { page: 2 }]);
    expect(target.querySelectorAll(".ph")).toHaveLength(2);
    expect(target.textContent).toContain("That's all · 2 photos");
    expect(end.watched()).toBe(0);
  });

  it("selects a day, counts it in the footer and adds exactly those photos", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push({
      photos: [photo("a"), photo("b"), photo("c", "2025-07-11T09:00:00.000Z")],
      nextPage: null,
    });
    const { browser, target, added, button, footer } = mountRoute(client);
    expect(footer()).toContain("Tap photos or pick a whole album");

    await browser.library.loadMore();
    flushSync();
    // WebKit's locale data drops the comma after the weekday.
    expect(target.querySelector(".day h2")?.textContent).toMatch(/^Sat,? 12 July 2025$/);
    button("Select day")?.click();
    flushSync();

    expect(footer()).toContain("2 selected");
    expect(button("Deselect day")).toBeDefined();
    button("Add 2")?.click();

    expect(added.map((photos) => photos.map(({ id }) => id))).toEqual([["a", "b"]]);
    expect(browser.selection.count).toBe(0);
  });

  it("selects every photo between two with a shift-click, across days", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push({
      photos: [
        photo("a"),
        photo("b"),
        photo("c", "2025-07-11T09:00:00.000Z"),
        photo("d", "2025-07-11T08:00:00.000Z"),
      ],
      nextPage: null,
    });
    const { browser, target, footer } = mountRoute(client);
    await browser.library.loadMore();
    flushSync();
    const tiles = [...target.querySelectorAll<HTMLButtonElement>(".ph")];

    tiles[1]?.click();
    tiles[3]?.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    flushSync();

    expect(footer()).toContain("3 selected");
    expect(tiles.map((tile) => tile.getAttribute("aria-pressed"))).toEqual([
      "false",
      "true",
      "true",
      "true",
    ]);
  });

  it("offers Try again when Immich isn't answering, keeping the selection", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push(new ImmichUnavailableError("unreachable"));
    client.photoAnswers.push({ photos: [photo("a")], nextPage: null });
    const { browser, target, button } = mountRoute(client);
    browser.selection.toggle(photo("kept"));

    await browser.library.loadMore();
    flushSync();
    expect(target.textContent).toContain("Immich isn't answering");

    button("Try again")?.click();
    await until(browser.library, (state) => state.done);
    flushSync();

    expect(target.querySelectorAll(".ph")).toHaveLength(1);
    expect(browser.selection.count).toBe(1);
  });

  it("names the problem Immich met, e.g. a rejected key, with Try again", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push(new ImmichUnavailableError("keyRejected"));
    const { browser, target, button } = mountRoute(client);

    await browser.library.loadMore();
    flushSync();

    expect(target.textContent).toContain("Immich can't be used right now");
    expect(target.textContent).toContain("Immich rejects the server's key.");
    expect(button("Try again")).toBeDefined();
    expect(target.textContent).not.toContain("Immich isn't answering");
  });
});

describe("ImmichRoute, one album", () => {
  it("says the album is loading while the albums are on their way", () => {
    const client = new FakeImmichClient();
    client.albumList = [LAKE];
    client.photoAnswers.push({ photos: [], nextPage: null });
    const { target } = mountRoute(client, "lake");
    flushSync();

    expect(target.textContent).toContain("Loading the album …");
  });

  it("names the albums' failure with Try again, then shows the album", async () => {
    const client = new FakeImmichClient();
    client.albumsError = new ImmichUnavailableError("permissionMissing");
    client.photoAnswers.push({ photos: [photo("l1")], nextPage: null });
    const { browser, target, button } = mountRoute(client, "lake");
    await until(browser, (state) => state.albumsFailure !== null);
    flushSync();
    expect(target.textContent).toContain("The server's key lacks permissions");

    client.albumsError = null;
    client.albumList = [LAKE];
    button("Try again")?.click();
    await until(browser, (state) => state.albums !== null);
    flushSync();

    expect(target.querySelector("h1")?.textContent).toBe("Lake");
  });

  it("names a failed Select all in the album and keeps its photos", async () => {
    const client = new FakeImmichClient();
    client.albumList = [LAKE];
    const { browser, target, button } = mountRoute(client, "lake");
    await browser.loadAlbums();
    client.photoAnswers.push(new ImmichUnavailableError("keyRejected"));
    flushSync();

    button("Select all")?.click();
    await until(browser, (state) => state.albumFailures.has("lake"));
    flushSync();

    expect(target.querySelector("h1")?.textContent).toBe("Lake");
    expect(target.querySelector("[role=alert]")?.textContent).toBe(
      "Immich rejects the server's key.",
    );
  });
});
