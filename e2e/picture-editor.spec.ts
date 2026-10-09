import { expect, test, type Locator, type Page } from "@playwright/test";
import { createSlideshow, definitionOf, editsStored, GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";

test.use(GERMAN_BROWSER);

/** Pointer travel split into steps, so a drag passes the editor's drag threshold as a hand does. */
const DRAG_STEPS = 8;

/** A page point given in picture coordinates (0–1 across and down the shown picture). */
async function onPicture(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator(".pic").boundingBox();
  if (box === null) {
    throw new Error("the picture editor shows no picture");
  }
  return { x: box.x + x * box.width, y: box.y + y * box.height };
}

/** The centre of `target` on the page. */
async function centreOf(target: Locator): Promise<{ x: number; y: number }> {
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error("the drag target is not shown");
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: DRAG_STEPS });
  await page.mouse.up();
}

test("E2E-020 a picture gets its own Ken Burns motion that is stored, and goes back to automatic with undo", async ({
  page,
}) => {
  const selectionBar = page.getByRole("toolbar", { name: "Ausgewähltes Bild" });
  const automaticTile = page.getByRole("button", {
    name: "Bild 2, aufgenommen am 14.07.2025",
    exact: true,
  });
  const ownTile = page.getByRole("button", {
    name: "Bild 2, aufgenommen am 14.07.2025, eigene Bewegung",
  });
  const state = page.locator(".motion .state");
  const frames = page.getByRole("group", { name: "Rahmen" });
  const startToggle = frames.getByRole("button", { name: /^Start/ });
  const endToggle = frames.getByRole("button", { name: /^Ende/ });
  const activeFrame = page.locator(".frame.active");
  await openApp(page);
  // The second picture zooms out: its start frame is inside the picture, free to move.
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 2);

  await automaticTile.click();
  await selectionBar.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navigationspfad" }).locator('[aria-current="page"]'),
  ).toHaveText("Bild 2");
  await expect(state).toHaveText("Automatisch");
  await expect(startToggle).toHaveAttribute("aria-pressed", "true");

  await drag(page, await onPicture(page, 0.55, 0.5), await onPicture(page, 0.5, 0.45));
  await expect(state).toHaveText("Eigene Bewegung");
  await expect(startToggle).toContainText("Zoom 1,20×");

  // Left of the moved start frame, inside the end frame, which spans the picture's width.
  const insideEndOnly = await onPicture(page, 0.04, 0.5);
  await page.mouse.click(insideEndOnly.x, insideEndOnly.y);
  await expect(endToggle).toHaveAttribute("aria-pressed", "true");
  await expect(activeFrame).toHaveAttribute("data-key", "to");
  await startToggle.click();
  await expect(activeFrame).toHaveAttribute("data-key", "from");
  await endToggle.click();
  await expect(activeFrame).toHaveAttribute("data-key", "to");
  await expect(endToggle).toContainText("Zoom 1,00×");

  await drag(
    page,
    await centreOf(activeFrame.locator('[data-corner="se"]')),
    await onPicture(page, 0.8, 0.75),
  );
  await expect(endToggle).not.toContainText("Zoom 1,00×");
  const endZoom = await endToggle.locator(".mono").innerText();
  const startFrame = await page.locator('.frame[data-key="from"]').getAttribute("style");
  const endFrame = await activeFrame.getAttribute("style");
  await editsStored(page);

  await page.reload();
  await expect(state).toHaveText("Eigene Bewegung");
  await expect(endToggle.locator(".mono")).toHaveText(endZoom);
  await expect(page.locator('.frame[data-key="from"]')).toHaveAttribute("style", startFrame ?? "");
  await expect(page.locator('.frame[data-key="to"]')).toHaveAttribute("style", endFrame ?? "");

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(ownTile).toHaveAttribute("aria-pressed", "true");
  await expect(ownTile.locator(".badge")).toHaveText("eigen");
  await expect(definitionOf(page, "Ken Burns")).toHaveText("automatisch, 1 eigene");

  await selectionBar.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(state).toHaveText("Eigene Bewegung");
  await page
    .getByRole("region", { name: "Ken Burns" })
    .getByRole("button", { name: "Zurück auf automatisch" })
    .click();
  await expect(state).toHaveText("Automatisch");
  await expect(
    page.getByRole("status").filter({ hasText: "Bewegung wieder automatisch" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(state).toHaveText("Eigene Bewegung");
  await expect(endToggle.locator(".mono")).toHaveText(endZoom);
});

test("E2E-022 a picture gets its own duration and transition, stored, and the transition goes back to automatic", async ({
  page,
}) => {
  const selectionBar = page.getByRole("toolbar", { name: "Ausgewähltes Bild" });
  const automaticTile = page.getByRole("button", {
    name: "Bild 2, aufgenommen am 14.07.2025",
    exact: true,
  });
  const ownTile = page.getByRole("button", {
    name: "Bild 2, aufgenommen am 14.07.2025, eigene Dauer 6,5 s, eigener Übergang Kreis",
  });
  const durationSection = page.locator('section[aria-labelledby="duration-label"]');
  const transitionSection = page.locator('section[aria-labelledby="transition-label"]');
  const durationState = durationSection.locator(".state");
  const transitionState = transitionSection.locator(".state");
  const durationValue = durationSection.locator("output.mono");
  const longer = durationSection.getByRole("button", { name: "Eine halbe Sekunde länger" });
  const circleTile = transitionSection.getByRole("radio", { name: /Kreis/ });
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 5);

  await automaticTile.click();
  await selectionBar.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(durationState).toHaveText("Automatisch");
  await expect(transitionState).toHaveText("Automatisch");

  await longer.click();
  await longer.click();
  await longer.click();
  await expect(durationState).toHaveText("Eigene Dauer");
  await expect(durationValue).toHaveText("6,5 s");

  await circleTile.click();
  await expect(transitionState).toHaveText("Eigener Übergang");
  await expect(circleTile).toHaveAttribute("aria-checked", "true");
  await editsStored(page);

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(ownTile).toHaveAttribute("aria-pressed", "true");
  await expect(ownTile.locator(".timing-badge.mono")).toHaveText("6,5 s");
  await expect(ownTile.locator(".timing-badge[title]")).toHaveAttribute("title", "Kreis");
  await expect(definitionOf(page, "Bildzeiten")).toHaveText("automatisch, 1 eigene");
  await expect(
    page.getByRole("button", { name: "Übergänge Überblenden Vorgabe · 1 eigener Ändern" }),
  ).toBeVisible();

  await selectionBar.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(transitionState).toHaveText("Eigener Übergang");
  await transitionSection.getByRole("button", { name: "Zurück auf automatisch" }).click();
  await expect(transitionState).toHaveText("Automatisch");
  await expect(
    page.getByRole("status").filter({ hasText: "Übergang wieder automatisch" }),
  ).toBeVisible();
});
