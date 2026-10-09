import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import { FakeImmichClient, photo } from "../../immich/testing/fake-immich-client";
import { destroyRoutes, LAKE, mountRoute, until } from "./testing/immich-route-harness";

afterEach(() => destroyRoutes());

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

  it("names a failed whole-album select on its card, keeping the grid", async () => {
    const client = new FakeImmichClient();
    client.albumList = [LAKE, { ...LAKE, id: "hike", name: "Hike" }];
    client.photoAnswers.push(new ImmichUnavailableError("unreachable"));
    const { browser, target } = mountRoute(client);
    browser.showTab("albums");
    await browser.loadAlbums();
    flushSync();

    target.querySelector<HTMLButtonElement>(".album .check")?.click();
    await until(browser, (state) => state.albumFailures.has("lake"));
    flushSync();

    expect(target.querySelectorAll(".album .name")).toHaveLength(2);
    expect([...target.querySelectorAll(".album .failed")].map((line) => line.textContent)).toEqual([
      "Immich isn't answering",
    ]);
  });

  it("says an album that is gone is gone, and leads back to the albums", async () => {
    const client = new FakeImmichClient();
    client.albumList = [LAKE];
    const { browser, target, calls, button } = mountRoute(client, "gone");

    await until(browser, (state) => state.albums !== null);
    flushSync();

    expect(target.textContent).toContain("This album is no longer in Immich");
    button("Back to albums")?.click();
    expect(calls.back).toBe(1);
  });

  it("offers Reload, not Try again, when the sign-in in front of Glissando has expired", async () => {
    const client = new FakeImmichClient();
    client.albumsError = new ImmichUnavailableError("signInExpired");
    const { browser, target, calls, button } = mountRoute(client, "lake");

    await until(browser, (state) => state.albumsFailure !== null);
    flushSync();

    expect(target.textContent).toContain("Your sign-in has expired.");
    expect(button("Try again")).toBeUndefined();
    button("Reload")?.click();
    expect(calls.reload).toBe(1);
  });
});
