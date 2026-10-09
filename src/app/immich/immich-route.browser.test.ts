import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import {
  ImmichUnavailableError,
  type ImmichAlbum,
  type ImmichPhoto,
} from "../../immich/immich-client";
import { FakeImmichClient, photo } from "../../immich/testing/fake-immich-client";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import type { EndObserver } from "./end-observer";
import { ImmichBrowser } from "./immich-browser";
import ImmichRoute from "./ImmichRoute.svelte";

let destroy = () => {};
afterEach(() => destroy());

const LAKE: ImmichAlbum = {
  id: "lake",
  name: "Lake",
  photoCount: 2,
  coverId: "l1",
  startDate: "2025-07-12T10:00:00.000Z",
  endDate: "2025-07-13T10:00:00.000Z",
};

/** An `EndObserver` the test drives: `reachEnd()` says the end is in view. */
function fakeEndObserver() {
  const watching = new Set<() => void>();
  const observe: EndObserver = (_element, onVisible) => {
    watching.add(onVisible);
    return () => watching.delete(onVisible);
  };
  return {
    observe,
    reachEnd: () => {
      for (const onVisible of watching) onVisible();
    },
    watched: () => watching.size,
  };
}

/** Resolves once a store-contract publisher's state meets `ready`: a state, not a wait. */
function until<State>(
  store: { subscribe(listener: (state: State) => void): () => void },
  ready: (state: State) => boolean,
): Promise<void> {
  let stop = () => {};
  const met = new Promise<void>((resolve) => {
    stop = store.subscribe((state) => {
      if (ready(state)) resolve();
    });
  });
  return met.finally(() => stop());
}

function mountRoute(client: FakeImmichClient, albumId: string | null = null) {
  const browser = new ImmichBrowser({ client });
  const end = fakeEndObserver();
  const added: (readonly ImmichPhoto[])[] = [];
  const opened: string[] = [];
  const mounted = mountWithTranslator(
    ImmichRoute,
    {
      browser,
      albumId,
      thumbnailUrl: (id: string) => `data:,${id}`,
      onBack: () => undefined,
      onOpenAlbum: (album: ImmichAlbum) => opened.push(album.id),
      onAdd: (photos: readonly ImmichPhoto[]) => added.push(photos),
      onError: (error: unknown) => {
        throw error;
      },
      observeEnd: end.observe,
    },
    { current: createTranslator("en") },
  );
  destroy = mounted.destroy;
  const target = mounted.target;
  const button = (label: string) =>
    [...target.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
  const footer = () => target.querySelector(".actions")?.textContent.replace(/\s+/g, " ").trim();
  return { browser, target, end, added, opened, button, footer };
}

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
    client.photoAnswers.push(new ImmichUnavailableError("offline"));
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
});

describe("ImmichRoute, Albums", () => {
  it("filters the albums by name and opens one", async () => {
    const client = new FakeImmichClient();
    client.albumList = [LAKE, { ...LAKE, id: "hike", name: "Hike" }];
    const { browser, target, opened, button } = mountRoute(client);

    button("Albums")?.click();
    await browser.loadAlbums();
    flushSync();
    const field = target.querySelector<HTMLInputElement>("input[type=search]");
    if (field === null) throw new Error("no album filter");
    field.value = "lak";
    field.dispatchEvent(new Event("input"));
    flushSync();

    expect([...target.querySelectorAll(".album .name")].map((name) => name.textContent)).toEqual([
      "Lake",
    ]);
    target.querySelector<HTMLButtonElement>(".album .open")?.click();
    expect(opened).toEqual(["lake"]);

    field.value = "Berge";
    field.dispatchEvent(new Event("input"));
    flushSync();
    expect(target.textContent).toContain("No album matches");
  });

  it("selects a whole album with the circle on its cover and badges it", async () => {
    const client = new FakeImmichClient();
    client.albumList = [LAKE];
    client.photoAnswers.push({ photos: [photo("l1"), photo("l2")], nextPage: null });
    const { browser, target, footer } = mountRoute(client);
    browser.showTab("albums");
    await browser.loadAlbums();
    flushSync();

    target.querySelector<HTMLButtonElement>(".album .check")?.click();
    await until(browser, (state) => state.membership.get("lake")?.complete === true);
    await until(browser, (state) => state.busyAlbumIds.size === 0);
    flushSync();

    expect(browser.selection.count).toBe(2);
    expect(target.querySelector(".badge")?.textContent.trim()).toBe("all selected");
    expect(footer()).toContain("2 selected");
  });
});
