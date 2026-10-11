import { expect, test } from "@playwright/test";
import { chooseFiles, definitionOf, picturesTakenOn } from "./support/app";
import { openApp } from "./support/browser";
import { textFile, toneTrack } from "./support/media";

// English, whose longer "Without music" title once widened the phone layout.
test.use({ locale: "en-GB" });

const PHONE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("E2E-038 music a browser cannot play becomes a FLAC copy; an unreadable file shows a notice", async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  // The shared helpers click German labels; this case is English.
  await page.getByRole("button", { name: "New slideshow" }).first().click();
  await chooseFiles(
    page,
    page.getByRole("button", { name: "Choose pictures" }),
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14"]),
  );
  await expect(page.getByText("2 pictures", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Which music?" })).toBeVisible();

  await chooseFiles(page, page.getByRole("button", { name: "Choose music" }), [
    textFile("Concert.mp3"),
  ]);
  await expect(page.getByRole("alert")).toContainText("This file can't be used");
  await expect(page.getByRole("alert")).toContainText("Glissando can't read “Concert.mp3”.");
  await expect(page.getByRole("button", { name: "Create without music" })).toBeEnabled();
  // The notice and the seconds panel fit the phone's width.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await chooseFiles(page, page.getByRole("button", { name: "Choose other music" }), [
    toneTrack("Evening Walk.m4a", "alac.m4a"),
  ]);
  await expect(page.getByText("Converted from Apple Lossless on this device")).toBeVisible();
  await expect(page.getByText("Evening Walk.m4a", { exact: true })).toBeVisible();
  await expect(page.getByText(/· FLAC$/)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(definitionOf(page, "Pictures")).toHaveText("2");

  await page.getByRole("button", { name: "Create slideshow" }).click();
  await expect(page.getByText("Slideshow created — tap Play")).toBeVisible();
});
