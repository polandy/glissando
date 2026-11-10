import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import { FakeImmichClient, photo } from "../../immich/testing/fake-immich-client";
import { destroyRoutes, mountRoute, until } from "./testing/immich-route-harness";

afterEach(() => destroyRoutes());

const MONTHS = [
  { month: "2025-07", count: 120 },
  { month: "2025-06", count: 80 },
  { month: "2024-12", count: 40 },
];
const FACES = [
  { id: "ann", name: "Ann" },
  { id: "bo", name: "Bo" },
];

function tabNames(target: HTMLElement): string[] {
  return [...target.querySelectorAll("[role=tab]")].map((tab) => tab.textContent.trim());
}

function typeFilter(target: HTMLElement, value: string): void {
  const field = target.querySelector<HTMLInputElement>("input[type=search]");
  if (field === null) throw new Error("no filter field");
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  flushSync();
}

describe("ImmichRoute, month jump", () => {
  it("opens a sheet of months by year and restarts the feed at the picked month", async () => {
    const client = new FakeImmichClient();
    client.months = MONTHS;
    client.photoAnswers.push(
      { photos: [photo("a")], nextPage: null },
      { photos: [photo("b", "2024-12-20T10:00:00Z")], nextPage: null },
    );
    const { browser, target, end } = mountRoute(client);
    await until(browser, (state) => state.months.items !== null);
    end.reachEnd();
    flushSync();
    const jump = target.querySelector<HTMLButtonElement>("[aria-haspopup=dialog]");
    expect(jump?.textContent.trim()).toBe("Jul 2025");

    jump?.click();
    flushSync();
    const sheet = document.querySelector("dialog[open]");
    expect(sheet?.querySelector("h2")?.textContent).toBe("Jump to a month");
    expect([...(sheet?.querySelectorAll("h3") ?? [])].map((year) => year.textContent)).toEqual([
      "2025",
      "2024",
    ]);
    expect(sheet?.textContent).toContain("≈ 120");
    const december = [...(sheet?.querySelectorAll("button.month") ?? [])].find((month) =>
      month.textContent.includes("Dec"),
    );
    (december as HTMLButtonElement).click();
    flushSync();
    end.reachEnd();
    await until(browser.library, (state) => state.photos.length === 1);
    flushSync();

    expect(client.photoQueries.at(-1)?.source).toEqual({
      kind: "library",
      favoritesOnly: false,
      takenBefore: "2025-01-01T00:00:00.000Z",
    });
    expect(target.querySelector("[aria-haspopup=dialog]")?.textContent.trim()).toBe("Dec 2024");
  });

  it("picks from the rail, which marks the current month", async () => {
    const client = new FakeImmichClient();
    client.months = MONTHS;
    client.photoAnswers.push(
      { photos: [photo("a")], nextPage: null },
      { photos: [photo("b")], nextPage: null },
    );
    const { browser, target } = mountRoute(client);
    await until(browser, (state) => state.months.items !== null);
    flushSync();
    const rail = target.querySelector("nav[aria-label=Months]");
    expect(rail?.querySelector("[aria-current]")?.textContent).toContain("Jul");

    const june = [...(rail?.querySelectorAll("button.month") ?? [])][1] as HTMLButtonElement;
    june.click();
    flushSync();

    expect(browser.state.month).toBe("2025-06");
    expect(target.querySelector("nav[aria-label=Months] [aria-current]")?.textContent).toContain(
      "Jun",
    );
  });

  it("restricts to favourites and combines it with the month", async () => {
    const client = new FakeImmichClient();
    client.months = MONTHS;
    client.photoAnswers.push({ photos: [], nextPage: null });
    const { browser, target, button, end } = mountRoute(client);
    await until(browser, (state) => state.months.items !== null);

    button("Favourites")?.click();
    flushSync();
    end.reachEnd();

    expect(target.querySelector("[aria-pressed=true]")?.textContent).toContain("Favourites");
    await until(browser.library, (state) => state.done);
    expect(client.photoQueries.at(-1)?.source).toEqual({
      kind: "library",
      favoritesOnly: true,
      takenBefore: null,
    });
  });
});

describe("ImmichRoute, optional tools", () => {
  it("shows People and Folders only when the key has them", () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push({ photos: [], nextPage: null });
    const withAll = mountRoute(client);
    expect(tabNames(withAll.target)).toEqual(["All pictures", "Albums", "People", "Folders"]);
    destroyRoutes();

    client.photoAnswers.push({ photos: [], nextPage: null });
    const without = mountRoute(client, null, undefined, ["person.read", "folder.read"]);
    expect(tabNames(without.target)).toEqual(["All pictures", "Albums"]);
  });

  it("hides the People tab and falls back to All pictures on a 403", async () => {
    const client = new FakeImmichClient();
    client.peopleError = new ImmichUnavailableError("permissionMissing");
    client.photoAnswers.push({ photos: [], nextPage: null });
    const { browser, target } = mountRoute(client);
    browser.showTab("people");
    await until(browser, (state) => state.people.unavailable);
    flushSync();

    expect(tabNames(target)).toEqual(["All pictures", "Albums", "Folders"]);
    expect(target.querySelector("[role=tab][aria-selected=true]")?.textContent.trim()).toBe(
      "All pictures",
    );
  });
});

describe("ImmichRoute, People", () => {
  it("lists faces, filters by name, opens a person and selects all of their pictures", async () => {
    const client = new FakeImmichClient();
    client.peopleList = FACES;
    client.photoAnswers.push(
      { photos: [photo("p1"), photo("p2")], nextPage: null },
      { photos: [photo("p1"), photo("p2")], nextPage: null },
    );
    const { browser, target, people } = mountRoute(client);
    browser.showTab("people");
    await until(browser, (state) => state.people.items !== null);
    flushSync();
    expect(target.querySelectorAll(".person .name")).toHaveLength(2);
    expect(target.querySelector(".face img")?.getAttribute("src")).toBe("data:,face-ann");

    typeFilter(target, "zzz");
    expect(target.textContent).toContain("No person matches");
    typeFilter(target, "bo");
    expect(target.querySelectorAll(".person .name")).toHaveLength(1);

    target.querySelector<HTMLButtonElement>(".person")?.click();
    expect(people).toEqual(["bo"]);
    destroyRoutes();

    const opened = mountRoute(client, { kind: "person", id: "ann" });
    await opened.browser.loadPeople();
    flushSync();
    expect(opened.target.querySelector("h1")?.textContent).toBe("Ann");
    opened.button("Select all")?.click();
    await until(opened.browser, (state) => state.membership.get("person:ann")?.complete === true);
    flushSync();

    expect(opened.browser.selection.count).toBe(2);
    expect(opened.footer()).toContain("2 selected");
  });
});

describe("ImmichRoute, Folders", () => {
  it("walks the path with the crumb and lists the subfolders", async () => {
    const client = new FakeImmichClient();
    client.paths = ["Trips/Italy", "Trips/Spain/Madrid", "Family"];
    client.photoAnswers.push({ photos: [photo("f1")], nextPage: null });
    const { browser, target } = mountRoute(client);
    browser.showTab("folders");
    await until(browser, (state) => state.folderPaths.items !== null);
    flushSync();
    const rows = () => [...target.querySelectorAll(".row")].map((row) => row.textContent.trim());
    expect(rows()).toEqual(["Trips 3 folders", "Family"]);

    browser.openFolder("Trips");
    flushSync();
    expect(rows()).toHaveLength(2);
    expect(target.querySelector("nav[aria-label=Folder] b")?.textContent).toBe("Trips");

    browser.openFolder("Trips/Spain");
    flushSync();
    const up = [...target.querySelectorAll<HTMLButtonElement>("nav[aria-label=Folder] button")];
    expect(up.map((crumb) => crumb.textContent.trim())).toEqual(["All folders", "Trips"]);
    up[1]?.click();
    flushSync();
    expect(browser.state.folderPath).toBe("Trips");
  });
});

describe("ImmichRoute, hidden notes", () => {
  it("notes the not-JPEG assets per day and in total in a source view", async () => {
    const client = new FakeImmichClient();
    client.albumList = [];
    client.photoAnswers.push({
      photos: [photo("p1")],
      hiddenTakenAt: ["2025-07-12T08:00:00Z", "2025-07-12T09:00:00Z"],
      nextPage: null,
    });
    client.peopleList = FACES;
    const { browser, target, end } = mountRoute(client, { kind: "person", id: "ann" });
    await browser.loadPeople();
    flushSync();
    end.reachEnd();
    await until(browser.sourceFeed({ kind: "person", id: "ann" }), (state) => state.done);
    flushSync();

    const notes = [...target.querySelectorAll(".note")].map((note) => note.textContent.trim());
    expect(notes).toEqual(["2 not JPEG, hidden", "2 not JPEG, hidden"]);
  });
});
