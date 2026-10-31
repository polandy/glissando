import { expect, test, type Locator } from "@playwright/test";
import { chooseFiles, GERMAN_BROWSER, openImport } from "./support/app";
import { openApp } from "./support/browser";
import { pictureTakenOn } from "./support/media";

// A common phone width, tall enough that the top bar and the filmstrip never meet (E2E-076).
const PHONE = { width: 412, height: 915 };

type Box = NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>;

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("the element has no layout box");
  return box;
}

test.use(GERMAN_BROWSER);

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("E2E-060 a picture of the pictures step opens full screen, browses, removes and closes", async ({
  page,
}, testInfo) => {
  const files = [
    await pictureTakenOn(page, "harbour.jpg", "2025-07-12", "#2e7d32"),
    await pictureTakenOn(page, "pier.jpg", "2025-07-13", "#1a237e"),
    await pictureTakenOn(page, "lake.jpg", "2025-07-14", "#ffd54f"),
  ];
  await openImport(page);
  await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), files);

  // Selects the tile, then opens it full screen from the selection bar (IMPORT_ARRANGING.md).
  await page.getByRole("button", { name: "Bild 2, aufgenommen am 13.07.2025" }).click();
  await page.getByRole("button", { name: "Ansehen" }).click();

  const viewer = page.getByRole("dialog");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText("2 von 3")).toBeVisible();
  await testInfo.attach("viewer", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("3 von 3")).toBeVisible();
  await viewer.getByRole("button", { name: "Bild 1 zeigen" }).click();
  await expect(viewer.getByText("1 von 3")).toBeVisible();

  await viewer.getByRole("button", { name: "Entfernen" }).click();
  await expect(viewer.getByText("1 von 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rückgängig" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  // harbour.jpg was removed, so the pier tile shown last closes focused at its new position, 1.
  await expect(
    page.getByRole("button", { name: "Bild 1, aufgenommen am 13.07.2025" }),
  ).toBeFocused();
});

test.describe("coarse pointer", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: PHONE });

  test("E2E-076 on a touch screen the side arrows stay visible, do not collide with the other bars, browse and are not swallowed as a swipe", async ({
    page,
  }) => {
    const files = [
      await pictureTakenOn(page, "harbour.jpg", "2025-07-12", "#2e7d32"),
      await pictureTakenOn(page, "pier.jpg", "2025-07-13", "#1a237e"),
      await pictureTakenOn(page, "lake.jpg", "2025-07-14", "#ffd54f"),
    ];
    await openImport(page);
    await chooseFiles(page, page.getByRole("button", { name: "Bilder auswählen" }), files);
    await page.getByRole("button", { name: "Bild 2, aufgenommen am 13.07.2025" }).click();
    await page.getByRole("button", { name: "Ansehen" }).click();

    const viewer = page.getByRole("dialog");
    await expect(viewer.getByText("2 von 3")).toBeVisible();
    const previous = viewer.getByRole("button", { name: "Vorheriges Bild" });
    const next = viewer.getByRole("button", { name: "Nächstes Bild" });
    await expect(previous).toBeVisible();
    await expect(next).toBeVisible();

    // Vertically centred between the top bar and the filmstrip, so neither overlaps them.
    const topBar = await boxOf(viewer.locator(".bar.top"));
    const filmstrip = await boxOf(viewer.locator(".bottom"));
    const previousBox = await boxOf(previous);
    expect(previousBox.y).toBeGreaterThanOrEqual(topBar.y + topBar.height);
    expect(previousBox.y + previousBox.height).toBeLessThanOrEqual(filmstrip.y);

    // A swipe on the picture (not on an arrow) still steps forward. Dispatched directly, since
    // simulating a touch drag through real input differs too much between engines to be reliable.
    const stagePicture = viewer.locator(".stage img");
    const y = PHONE.height / 2;
    await stagePicture.dispatchEvent("pointerdown", { clientX: 250, clientY: y, bubbles: true });
    await stagePicture.dispatchEvent("pointerup", { clientX: 150, clientY: y, bubbles: true });
    await expect(viewer.getByText("3 von 3")).toBeVisible();

    // Tapping an arrow browses but is not also treated as the start of a swipe: the bars,
    // which a swipe's tap-to-hide would otherwise fade out, stay shown.
    await previous.click();
    await expect(viewer.getByText("2 von 3")).toBeVisible();
    await expect(previous).toHaveCSS("opacity", "1");
  });
});
