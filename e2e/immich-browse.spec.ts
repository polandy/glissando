import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

interface ImmichAsset {
  readonly id: string;
  readonly originalFileName: string;
  readonly originalMimeType?: string;
  readonly localDateTime: string;
}

interface SearchBody {
  readonly isFavorite?: boolean;
  readonly takenBefore?: string;
  readonly personIds?: string[];
}

const PERSON_ID = "5d3c0a52-6f5e-4b1e-8a43-6c1f0e0a9b11";
const FOLDER_PATH = "Holidays/2019";
const PIXEL = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHUkq9wAAAABJRU5ErkJggg==",
  ),
  (character) => character.charCodeAt(0),
);

/** A recorded answer of a real Immich (`src/immich/fixtures`). */
function fixture<Answer>(name: string): Answer {
  const bytes = readFileSync(new URL(`../src/immich/fixtures/${name}.json`, import.meta.url));
  return JSON.parse(new TextDecoder().decode(bytes)) as Answer;
}

/** The recorded first page's first asset, as a JPEG and as a HEIC taken the same day. */
function pictures(): { jpeg: ImmichAsset; heic: ImmichAsset } {
  const page = fixture<{ assets: { items: ImmichAsset[] } }>("search-all-page-1");
  const [first] = page.assets.items;
  if (first === undefined) throw new Error("the recorded page has photos");
  const jpeg = { ...first, originalMimeType: "image/jpeg" };
  return {
    jpeg,
    heic: {
      ...first,
      id: "9a1b2c3d-0000-4000-8000-000000000001",
      originalFileName: "IMG_0001.HEIC",
      originalMimeType: "image/heic",
    },
  };
}

/** What the fake Immich saw of the browser's searches and folder reads. */
interface BrowseTraffic {
  readonly searches: SearchBody[];
  readonly folderReads: string[];
}

/** Answers `/immich/` like an Immich that has favourites, two months, one person and a folder. */
async function fakeImmich(page: Page): Promise<BrowseTraffic> {
  const { jpeg, heic } = pictures();
  const traffic: BrowseTraffic = { searches: [], folderReads: [] };
  await page.route("**/immich/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/immich\//, "");
    if (path === "api/server/version") return route.fulfill({ json: fixture("server-version") });
    if (path === "api/albums") return route.fulfill({ json: fixture("albums") });
    if (path === "api/timeline/buckets") {
      return route.fulfill({
        json: [
          { timeBucket: "2025-07-01T00:00:00.000Z", count: 3 },
          { timeBucket: "2019-07-01T00:00:00.000Z", count: 5 },
        ],
      });
    }
    if (path === "api/people") {
      return route.fulfill({
        json: { hasNextPage: false, people: [{ id: PERSON_ID, name: "Test Person" }] },
      });
    }
    if (path === "api/view/folder/unique-paths") return route.fulfill({ json: [FOLDER_PATH] });
    if (path === "api/view/folder") {
      traffic.folderReads.push(url.searchParams.get("path") ?? "");
      return route.fulfill({ json: [jpeg] });
    }
    if (path === "api/search/metadata") {
      traffic.searches.push(request.postDataJSON() as SearchBody);
      return route.fulfill({ json: { assets: { items: [heic, jpeg], nextPage: null } } });
    }
    if (/^api\/people\/[^/]+\/thumbnail$/.test(path) || /\/thumbnail$/.test(path)) {
      return route.fulfill({ contentType: "image/png", body: PIXEL });
    }
    return route.fulfill({ status: 404 });
  });
  return traffic;
}

async function openBrowser(page: Page): Promise<BrowseTraffic> {
  const traffic = await fakeImmich(page);
  await openApp(page);
  await openImport(page);
  await page.getByRole("button", { name: "Immich öffnen" }).click();
  return traffic;
}

test("E2E-128 All pictures lists only the JPEG and says how many pictures it hides; Favourites asks Immich for favourites only", async ({
  page,
}) => {
  const traffic = await openBrowser(page);
  const { jpeg } = pictures();

  await expect(
    page.getByRole("button", { name: jpeg.originalFileName, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "IMG_0001.HEIC" })).toHaveCount(0);
  await expect(page.getByText("1 kein JPEG, ausgeblendet").first()).toBeVisible();

  const favourites = page.getByRole("button", { name: "Favoriten", exact: true });
  await expect(favourites).toHaveAttribute("aria-pressed", "false");
  await favourites.click();
  await expect(favourites).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => traffic.searches.some((body) => body.isFavorite === true)).toBe(true);
});

test("E2E-129 a month picked from the months rail shows the pictures up to the end of that month", async ({
  page,
}) => {
  const traffic = await openBrowser(page);

  const months = page.getByRole("navigation", { name: "Monate" });
  await expect(months.getByRole("heading", { name: "2019" })).toBeVisible();
  await months.getByRole("button", { name: /Jul.*≈ 5/ }).click();
  await expect(months.getByRole("button", { name: /Jul.*≈ 5/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect
    .poll(() => traffic.searches.some((body) => body.takenBefore === "2019-08-01T00:00:00.000Z"))
    .toBe(true);
});

test("E2E-130 a person's pictures are asked for by that person; a folder opens through its path", async ({
  page,
}) => {
  const traffic = await openBrowser(page);

  await page.getByRole("tab", { name: "Personen" }).click();
  await page.getByRole("button", { name: "Test Person" }).click();
  await expect
    .poll(() => traffic.searches.some((body) => body.personIds?.[0] === PERSON_ID))
    .toBe(true);

  await page.getByRole("button", { name: "Immich", exact: true }).click();
  await page.getByRole("tab", { name: "Ordner" }).click();
  await page.getByRole("button", { name: "Holidays" }).click();
  await page.getByRole("button", { name: "2019" }).click();
  await expect.poll(() => traffic.folderReads).toContain(FOLDER_PATH);
  await expect(page.getByRole("button", { name: pictures().jpeg.originalFileName })).toBeVisible();
});
