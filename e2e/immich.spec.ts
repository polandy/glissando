import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { CREATED_TOAST, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";
import { pictureTakenOn } from "./support/media";

test.use(GERMAN_BROWSER);

/** An asset as Immich's search lists it; only the fields the case changes are typed. */
interface ImmichAsset {
  readonly id: string;
  readonly originalFileName: string;
  readonly localDateTime: string;
}

interface ImmichSearch {
  readonly assets: { readonly items: ImmichAsset[]; readonly nextPage: string | null };
}

/** A picture's focus as the library stores it. */
interface StoredFocus {
  readonly kind: string;
  readonly box?: { readonly x: number; readonly y: number };
}

/** A recorded answer of a real Immich (`src/immich/fixtures`). */
function fixture<Answer>(name: string): Answer {
  const bytes = readFileSync(new URL(`../src/immich/fixtures/${name}.json`, import.meta.url));
  return JSON.parse(new TextDecoder().decode(bytes)) as Answer;
}

const FACES_ALBUM_ID = "2652da63-9fe6-4c6d-b527-fc2b01107d00";
const FACE = fixture<{ boundingBoxX1: number; imageWidth: number }[]>("faces-one");
const FACE_LEFT = (FACE[0]?.boundingBoxX1 ?? 0) / (FACE[0]?.imageWidth ?? 1);

/**
 * The library's "All photos": the recorded first page (a face photo and two landscapes) and one
 * more landscape a day earlier, so a range has a photo between its ends.
 */
function libraryPage(): ImmichSearch {
  const page = fixture<ImmichSearch>("search-all-page-1");
  const [, , landscape] = page.assets.items;
  if (landscape === undefined) throw new Error("the recorded page has three photos");
  const earlier: ImmichAsset = {
    ...landscape,
    id: "8e726f72-b602-4950-9d3c-95df4c1cc362",
    originalFileName: "land1_lake.jpg",
    localDateTime: "2019-07-01T10:00:00.000Z",
  };
  return { assets: { items: [...page.assets.items, earlier], nextPage: null } };
}

/** What the fake Glissando route saw: every request's headers and the photos asked for faces. */
interface ImmichTraffic {
  readonly headers: Record<string, string>[];
  readonly facesAsked: Set<string>;
}

/**
 * Answers the self-hosted Glissando's `/immich/` route like a real Immich behind it, from the
 * recorded fixtures; every photo is `photo()`. Only the faces album's photos have a face.
 */
async function fakeImmich(page: Page, photo: () => Uint8Array): Promise<ImmichTraffic> {
  const albumPhotos = fixture<ImmichSearch>("search-album");
  const faceIds = new Set(albumPhotos.assets.items.map(({ id }) => id));
  const traffic: ImmichTraffic = { headers: [], facesAsked: new Set() };
  await page.route("**/immich/**", async (route: Route) => {
    const request = route.request();
    traffic.headers.push(await request.allHeaders());
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/immich\//, "");
    if (path === "api/server/version") return route.fulfill({ json: fixture("server-version") });
    if (path === "api/albums") return route.fulfill({ json: fixture("albums") });
    if (path === "api/search/metadata") {
      const query = request.postDataJSON() as { albumIds?: string[] };
      const answer = query.albumIds?.includes(FACES_ALBUM_ID) ? albumPhotos : libraryPage();
      return route.fulfill({ json: answer });
    }
    if (path === "api/faces") {
      const photoId = url.searchParams.get("id") ?? "";
      traffic.facesAsked.add(photoId);
      return route.fulfill({ json: faceIds.has(photoId) ? fixture("faces-one") : [] });
    }
    if (/^api\/assets\/[^/]+\/(thumbnail|original)$/.test(path)) {
      return route.fulfill({ contentType: "image/jpeg", body: photo() });
    }
    return route.fulfill({ status: 404 });
  });
  return traffic;
}

/** Every focus record and the number of stored pictures, read from the library database. */
function storedFocus(page: Page): Promise<{ pictures: number; focus: StoredFocus[] }> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const opening = indexedDB.open("glissando");
        opening.onerror = () => reject(opening.error ?? new Error("opening the library failed"));
        opening.onsuccess = () => {
          const transaction = opening.result.transaction(["pictures", "focus"], "readonly");
          const pictures = transaction.objectStore("pictures").count();
          const focus = transaction.objectStore("focus").getAll();
          transaction.oncomplete = () => {
            opening.result.close();
            resolve({ pictures: pictures.result, focus: focus.result as StoredFocus[] });
          };
        };
      }),
  );
}

test("E2E-029 photos picked in Immich by day, by range and by whole album are imported with Immich's capture dates and faces as focus, and become a slideshow; the browser never sends the key", async ({
  page,
}) => {
  let jpeg: Uint8Array | null = null;
  const traffic = await fakeImmich(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page);
  // A capture day Immich does not know, so a tile showing Immich's date shows it came from Immich.
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2001-01-01", "#4db6ac")).buffer;
  const footer = page.locator(".actions");
  const tile = (fileName: string) => page.getByRole("button", { name: fileName, exact: true });

  await openImport(page);
  await expect(page.getByText("Aus Immich", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Immich öffnen" }).click();

  await expect(page.getByRole("tab", { name: "Alle Fotos" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    /12\. Juli 2025/,
    /3\. Juli 2019/,
    /2\. Juli 2019/,
    /1\. Juli 2019/,
  ]);
  await expect(footer).toContainText("Tippe Fotos an oder wähle ein ganzes Album");
  const july2025 = page.locator("section").filter({
    has: page.getByRole("heading", { name: /12\. Juli 2025/ }),
  });
  await july2025.getByRole("button", { name: "Tag wählen" }).click();
  await expect(july2025.getByRole("button", { name: "Tag abwählen" })).toBeVisible();
  await expect(tile("face6_rotated.jpg")).toHaveAttribute("aria-pressed", "true");

  await tile("land3_matterhorn.jpg").click();
  await tile("land1_lake.jpg").click({ modifiers: ["Shift"] });
  await expect(tile("land2_yellowstone.jpg")).toHaveAttribute("aria-pressed", "true");
  await expect(tile("land1_lake.jpg")).toHaveAttribute("aria-pressed", "true");
  await expect(footer).toContainText("4 gewählt");

  await page.getByRole("tab", { name: "Alben" }).click();
  const facesAlbum = page.getByRole("listitem").filter({ hasText: "Faces Lab" });
  await facesAlbum.getByRole("button", { name: "Ganzes Album wählen" }).click();
  await expect(facesAlbum.getByRole("button", { name: "Ganzes Album abwählen" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // The album's newest photo is already selected from its day: nine photos, not ten.
  await expect(footer).toContainText("9 gewählt");
  await footer.getByRole("button", { name: "9 hinzufügen" }).click();

  await expect(page.getByRole("heading", { name: "Welche Bilder?" })).toBeVisible();
  await expect(page.getByText("9 Bilder", { exact: true })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveText([
    "15.06.2019",
    "16.06.2019",
    "17.06.2019",
    "18.06.2019",
    "19.06.2019",
    "01.07.2019",
    "02.07.2019",
    "03.07.2019",
    "12.07.2025",
  ]);
  const next = page.getByRole("button", { name: "Weiter" });
  await expect(next).toBeEnabled();

  // No slideshow exists yet, so the on-device focus pass has not looked at these pictures: every
  // focus stored is the one Immich's faces gave, and the landscapes have none.
  const stored = await storedFocus(page);
  expect(stored.pictures).toBe(9);
  expect(stored.focus).toHaveLength(6);
  for (const focus of stored.focus) {
    expect(focus.kind).toBe("subject");
    expect(focus.box?.x).toBeCloseTo(FACE_LEFT);
  }

  await next.click();
  await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText(CREATED_TOAST);

  expect([...traffic.facesAsked]).toHaveLength(9);
  expect(traffic.headers.length).toBeGreaterThan(traffic.facesAsked.size);
  expect(traffic.headers.filter((headers) => "x-api-key" in headers)).toEqual([]);
});
