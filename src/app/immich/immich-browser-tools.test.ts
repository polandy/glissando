import { describe, expect, it } from "vitest";
import {
  ImmichUnavailableError,
  type ImmichPerson,
  type ImmichUnavailableKind,
  type TimelineMonth,
} from "../../immich/immich-client";
import { FakeImmichClient } from "../../immich/testing/fake-immich-client";
import { ImmichBrowser } from "./immich-browser";

const MONTHS: readonly TimelineMonth[] = [
  { month: "2025-08", count: 96 },
  { month: "2025-07", count: 412 },
];
const LENA: ImmichPerson = { id: "p1", name: "Lena" };
const PATHS = ["Pictures/Camera", "Pictures/Scans"];

function setUp() {
  const client = new FakeImmichClient();
  client.months = MONTHS;
  client.peopleList = [LENA];
  client.paths = PATHS;
  const reported: ImmichUnavailableKind[] = [];
  const browser = new ImmichBrowser({ client, reportUnavailable: (kind) => reported.push(kind) });
  return { client, browser, reported };
}

describe("ImmichBrowser, the optional tools", () => {
  it("reads the months, the people and the folders once, however often their tab opens", async () => {
    const { client, browser } = setUp();

    await Promise.all([browser.loadMonths(), browser.loadMonths()]);
    await browser.loadMonths();
    await browser.loadPeople();
    await browser.loadPeople();
    await browser.loadFolders();
    await browser.loadFolders();

    expect(browser.state.months.items).toEqual(MONTHS);
    expect(browser.state.people.items).toEqual([LENA]);
    expect(browser.state.folderPaths.items).toEqual(PATHS);
    expect([client.monthsCalls, client.peopleCalls, client.folderCalls]).toEqual([1, 1, 1]);
  });

  it("hides a tool whose list answers permission missing, without telling the availability", async () => {
    const { client, browser, reported } = setUp();
    client.monthsError = new ImmichUnavailableError("permissionMissing");
    client.peopleError = new ImmichUnavailableError("permissionMissing");
    client.foldersError = new ImmichUnavailableError("permissionMissing");

    await browser.loadMonths();
    await browser.loadPeople();
    await browser.loadFolders();

    expect(browser.state.months).toMatchObject({ unavailable: true, failure: null });
    expect(browser.state.people).toMatchObject({ unavailable: true, failure: null });
    expect(browser.state.folderPaths).toMatchObject({ unavailable: true, failure: null });
    expect(reported).toEqual([]);
  });

  it("does not ask a hidden tool again", async () => {
    const { client, browser } = setUp();
    client.peopleError = new ImmichUnavailableError("permissionMissing");
    await browser.loadPeople();

    await browser.loadPeople();

    expect(client.peopleCalls).toBe(1);
  });

  it("fails another problem like the albums do: reported, shown, asked again on retry", async () => {
    const { client, browser, reported } = setUp();
    client.peopleError = new ImmichUnavailableError("unreachable");

    await browser.loadPeople();
    expect(browser.state.people).toMatchObject({ failure: "unreachable", unavailable: false });
    expect(reported).toEqual(["unreachable"]);
    await browser.loadPeople();
    expect(client.peopleCalls).toBe(1);

    client.peopleError = null;
    await browser.retryPeople();

    expect(browser.state.people).toMatchObject({ items: [LENA], failure: null });
  });

  it("retries the months and the folders the same way", async () => {
    const { client, browser } = setUp();
    client.monthsError = new ImmichUnavailableError("offline");
    client.foldersError = new ImmichUnavailableError("offline");
    await browser.loadMonths();
    await browser.loadFolders();
    client.monthsError = null;
    client.foldersError = null;

    await browser.retryMonths();
    await browser.retryFolders();

    expect(browser.state.months.items).toEqual(MONTHS);
    expect(browser.state.folderPaths.items).toEqual(PATHS);
  });

  it("surfaces an error that is no Immich problem instead of hiding it", async () => {
    const { client, browser } = setUp();
    client.peopleError = new TypeError("a bug");

    await expect(browser.loadPeople()).rejects.toThrow("a bug");
  });

  it("keeps the folder the user is in across visits, null being the top", () => {
    const { browser } = setUp();
    expect(browser.state.folderPath).toBeNull();

    browser.openFolder("Pictures/Camera");

    expect(browser.state.folderPath).toBe("Pictures/Camera");
    browser.openFolder(null);
    expect(browser.state.folderPath).toBeNull();
  });
});
