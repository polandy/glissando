import { expect, test, type Page } from "@playwright/test";
import {
  chooseCustomMood,
  createSlideshow,
  createSlideshowWithMusic,
  editsStored,
  GERMAN_BROWSER,
} from "./support/app";
import { openApp } from "./support/browser";
import { centreOf, drag } from "./support/pointer";
import { clickTrackWav } from "./support/media";

test.use(GERMAN_BROWSER);

/** A page point given in picture coordinates (0–1 across and down the shown picture). */
async function onPicture(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId("frame-well-picture").boundingBox();
  if (box === null) {
    throw new Error("the picture editor shows no picture");
  }
  return { x: box.x + x * box.width, y: box.y + y * box.height };
}

test("E2E-020 a picture gets its own Ken Burns motion that is stored, and goes back to automatic with undo", async ({
  page,
}) => {
  const selectionBar = page.getByRole("toolbar", { name: "Auswahl" });
  const automaticTile = page.getByRole("button", {
    name: "Bild 2, aufgenommen am 14.07.2025",
    exact: true,
  });
  const ownTile = page.getByRole("button", {
    name: "Bild 2, aufgenommen am 14.07.2025, gewählte Bewegung",
  });
  const kenBurns = page.getByRole("region", { name: "Bewegung" });
  const stateIs = (text: string) => kenBurns.getByText(text, { exact: true });
  const frames = page.getByRole("group", { name: "Rahmen" });
  const startToggle = frames.getByRole("button", { name: /^Start/ });
  const endToggle = frames.getByRole("button", { name: /^Ende/ });
  const startFrameBox = page.getByRole("application", { name: /^Startrahmen/ });
  const endFrameBox = page.getByRole("application", { name: /^Endrahmen/ });
  await openApp(page);
  // The second picture zooms out: its start frame is inside the picture, free to move.
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"], 2);

  await automaticTile.click();
  await selectionBar.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navigationspfad" }).locator('[aria-current="page"]'),
  ).toHaveText("Bild 2");
  await expect(stateIs("Automatisch")).toBeVisible();
  await expect(startToggle).toHaveAttribute("aria-pressed", "true");

  await drag(page, await onPicture(page, 0.55, 0.5), await onPicture(page, 0.5, 0.45));
  await expect(stateIs("Gewählt")).toBeVisible();
  await expect(startFrameBox).toHaveAttribute("aria-label", "Startrahmen, Zoom 1,20×");

  // Left of the moved start frame, inside the end frame, which spans the picture's width.
  const insideEndOnly = await onPicture(page, 0.04, 0.5);
  await page.mouse.click(insideEndOnly.x, insideEndOnly.y);
  await expect(endToggle).toHaveAttribute("aria-pressed", "true");
  await expect(endFrameBox).toHaveAttribute("tabindex", "0");
  await startToggle.click();
  await expect(startFrameBox).toHaveAttribute("tabindex", "0");
  await endToggle.click();
  await expect(endFrameBox).toHaveAttribute("tabindex", "0");
  await expect(endFrameBox).toHaveAttribute("aria-label", "Endrahmen, Zoom 1,00×");

  await drag(
    page,
    await centreOf(endFrameBox.locator('[data-corner="se"]')),
    await onPicture(page, 0.8, 0.75),
  );
  await expect(endFrameBox).not.toHaveAttribute("aria-label", "Endrahmen, Zoom 1,00×");
  const endZoom = await endFrameBox.getAttribute("aria-label");
  const startFrame = await startFrameBox.getAttribute("style");
  const endFrame = await endFrameBox.getAttribute("style");
  await editsStored(page);

  await page.reload();
  await expect(stateIs("Gewählt")).toBeVisible();
  await expect(endFrameBox).toHaveAttribute("aria-label", endZoom ?? "");
  await expect(startFrameBox).toHaveAttribute("style", startFrame ?? "");
  await expect(endFrameBox).toHaveAttribute("style", endFrame ?? "");

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(ownTile).toHaveAttribute("aria-pressed", "true");
  await expect(ownTile.getByText("gewählt", { exact: true })).toBeVisible();

  await selectionBar.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(stateIs("Gewählt")).toBeVisible();
  await page
    .getByRole("region", { name: "Bewegung" })
    .getByRole("button", { name: "Zurück auf automatisch" })
    .click();
  await expect(stateIs("Automatisch")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Bewegung wieder automatisch" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(stateIs("Gewählt")).toBeVisible();
  await expect(endFrameBox).toHaveAttribute("aria-label", endZoom ?? "");
});

test("E2E-022 a picture gets its chosen duration and transition, stored, and both go back to automatic together", async ({
  page,
}) => {
  const selectionBar = page.getByRole("toolbar", { name: "Auswahl" });
  const automaticTile = page.getByRole("button", {
    name: "Bild 2, aufgenommen am 14.07.2025",
    exact: true,
  });
  const ownTile = page.getByRole("button", {
    name: "Bild 2, aufgenommen am 14.07.2025, gewählte Bilddauer 6,5 s, gewählter Übergang Kreis",
  });
  const timingSection = page.locator('section[aria-labelledby="timing-label"]');
  const timingStateIs = (text: string) => timingSection.getByText(text, { exact: true });
  const lengthSlider = timingSection.getByRole("slider", { name: "Bilddauer" });
  const circleTile = timingSection.getByRole("radio", { name: /Kreis/ });
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"]);
  // A new slideshow opens on Calm (ADR-0050); this case is
  // about a picture's chosen duration against the automatic one, so it switches back to Custom.
  await chooseCustomMood(page);

  await automaticTile.click();
  await selectionBar.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(timingStateIs("Automatisch")).toBeVisible();

  // Each ArrowRight is one stored half-second step.
  await lengthSlider.focus();
  for (let step = 0; step < 3; step += 1) {
    await lengthSlider.press("ArrowRight");
  }
  await expect(timingStateIs("Gewählt")).toBeVisible();
  await expect(lengthSlider).toHaveAttribute("aria-valuetext", "6,5 s");

  await circleTile.click();
  await expect(circleTile).toHaveAttribute("aria-checked", "true");
  await editsStored(page);

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(ownTile).toHaveAttribute("aria-pressed", "true");
  await expect(ownTile.getByText("6,5 s", { exact: true })).toBeVisible();
  await expect(ownTile.getByTitle("Kreis", { exact: true })).toBeVisible();
  // The Transitions row lives behind the Fine settings fold (ADR-0048).
  await page.getByRole("button", { name: "Weitere Einstellungen" }).click();
  await expect(
    page.getByRole("button", { name: "Übergänge Überblenden Automatisch · 1 Bild gewählt" }),
  ).toBeVisible();

  await selectionBar.getByRole("button", { name: "Bearbeiten" }).click();
  await expect(timingStateIs("Gewählt")).toBeVisible();
  await expect(lengthSlider).toHaveAttribute("aria-valuetext", "6,5 s");
  await timingSection.getByRole("button", { name: "Zurück auf automatisch" }).click();
  await expect(timingStateIs("Automatisch")).toBeVisible();
  await expect(circleTile).toHaveAttribute("aria-checked", "false");
  await expect(
    page.getByRole("status").filter({ hasText: "Zeitablauf wieder automatisch" }),
  ).toBeVisible();
});

test("E2E-116 the picture editor's transition hint says what plays into the next picture and for how long", async ({
  page,
}) => {
  const timingSection = page.locator('section[aria-labelledby="timing-label"]');
  const hint = timingSection.getByText(/ zu Bild 3, /);
  await openApp(page);
  await createSlideshow(page, ["2025-07-12", "2025-07-14", "2025-07-20"]);
  await chooseCustomMood(page);

  await page
    .getByRole("button", { name: "Bild 2, aufgenommen am 14.07.2025", exact: true })
    .click();
  await page
    .getByRole("toolbar", { name: "Auswahl" })
    .getByRole("button", { name: "Bearbeiten" })
    .click();
  await expect(hint).toContainText(/Überblenden zu Bild 3, \d+,\d s\.$/);
  await expect(hint).not.toContainText("%");

  await timingSection.getByRole("radio", { name: /Kreis/ }).click();
  await expect(hint).toContainText(/Kreis zu Bild 3, \d+,\d s\.$/);
});

test("E2E-124 the picture editor says a picture whose length follows the music shows for as long as its slider says", async ({
  page,
}) => {
  const timingSection = page.locator('section[aria-labelledby="timing-label"]');
  const lengthSlider = timingSection.getByRole("slider", { name: "Bilddauer" });
  await openApp(page);
  await createSlideshowWithMusic(page, clickTrackWav("Takt.wav", 20, 120), { fill: true });

  await page
    .getByRole("button", { name: "Bild 2, aufgenommen am 14.07.2025", exact: true })
    .click();
  await page
    .getByRole("toolbar", { name: "Auswahl" })
    .getByRole("button", { name: "Bearbeiten" })
    .click();
  const length = await lengthSlider.getAttribute("aria-valuetext");
  expect(length).toMatch(/^\d+,\d s$/);
  await expect(
    timingSection.getByText(`Folgt der Musik: ${length}.`, { exact: true }),
  ).toBeVisible();
});
