import { expect, test } from "@playwright/test";
import { createSlideshow, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { tile } from "./support/strip";
import { stripHead } from "./support/strip-head";

test.use(GERMAN_BROWSER);

test("E2E-110 Sort by date shows only for the user's own order, puts the pictures back in capture order with an undo, and the date order survives a reload", async ({
  page,
}) => {
  const head = stripHead(page);
  const sortByDate = head.getByRole("button", { name: "Nach Aufnahmedatum sortieren" });
  const selectionBar = page.getByRole("toolbar", { name: "Auswahl" });
  // The order line under the strip header: which order the pictures are in.
  const orderLine = head.getByText(/^(Nach Aufnahmedatum sortiert|Deine Reihenfolge)/);
  await openApp(page);
  await createSlideshow(page, ["2025-07-01", "2025-07-02", "2025-07-03", "2025-07-04"]);

  // In capture order the button is not offered, while its neighbour Shuffle is.
  await expect(head.getByRole("button", { name: "Mischen" })).toBeVisible();
  await expect(orderLine).toHaveText("Nach Aufnahmedatum sortiert");
  await expect(sortByDate).toHaveCount(0);

  // A manual move (deterministic, unlike Shuffle) makes the order the user's own.
  await head.getByRole("button", { name: "Auswählen" }).click();
  await tile(page, 1, "01.07.2025").click();
  await selectionBar.getByRole("button", { name: "Später" }).click();
  await selectionBar.getByRole("button", { name: "Fertig" }).click();
  await expect(tile(page, 1, "02.07.2025")).toBeVisible();
  await expect(tile(page, 2, "01.07.2025")).toBeVisible();
  await expect(orderLine).toHaveText(/^Deine Reihenfolge/);

  // Sort by date restores capture order, ends the own order and hides itself again.
  await sortByDate.click();
  await expect(page.getByRole("status")).toContainText("4 Bilder nach Aufnahmedatum sortiert");
  await expect(tile(page, 1, "01.07.2025")).toBeVisible();
  await expect(tile(page, 2, "02.07.2025")).toBeVisible();
  await expect(orderLine).toHaveText("Nach Aufnahmedatum sortiert");
  await expect(sortByDate).toHaveCount(0);

  // Undo brings the own order back, and with it the button.
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(tile(page, 1, "02.07.2025")).toBeVisible();
  await expect(tile(page, 2, "01.07.2025")).toBeVisible();
  await expect(orderLine).toHaveText(/^Deine Reihenfolge/);
  await expect(sortByDate).toBeVisible();

  // Sorted once more, the capture order is what is stored.
  await sortByDate.click();
  await expect(tile(page, 1, "01.07.2025")).toBeVisible();
  await editsStored(page);
  await page.reload();
  await expect(tile(page, 1, "01.07.2025")).toBeVisible();
  await expect(tile(page, 2, "02.07.2025")).toBeVisible();
  await expect(tile(page, 3, "03.07.2025")).toBeVisible();
  await expect(tile(page, 4, "04.07.2025")).toBeVisible();
  await expect(orderLine).toHaveText("Nach Aufnahmedatum sortiert");
  await expect(head.getByRole("button", { name: "Mischen" })).toBeVisible();
  await expect(sortByDate).toHaveCount(0);
});
