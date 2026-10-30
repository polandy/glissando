import { expect, test, type Page } from "@playwright/test";
import { GERMAN_BROWSER } from "./support/app";
import { openApp } from "./support/browser";
import { fakeGlissandoServer } from "./support/fake-glissando-server";
import { pictureTakenOn } from "./support/media";
import { createServerSlideshow } from "./support/server-slideshow";
import { chooseShareRow } from "./support/share";

test.use(GERMAN_BROWSER);

const TV_CODE_LENGTH = 4;

/** The 4-letter code the TV page shows while unpaired (`tv-parts.ts`'s `.tv-code`). */
function tvCode(tv: Page) {
  return tv.locator(".tv-code");
}

test("E2E-051 the TV shows a code, the phone claims it and chooses the slideshow, and the remote pauses it", async ({
  page,
}) => {
  let jpeg: Uint8Array | null = null;
  const server = await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;
  await createServerSlideshow(page);

  const tv = await page.context().newPage();
  server.attachPage(tv);
  await tv.goto("/tv");
  await expect(tvCode(tv)).toHaveText(new RegExp(`^.{${TV_CODE_LENGTH}}$`));
  const code = (await tvCode(tv).textContent()) ?? "";

  await page.getByRole("button", { name: /^Auf dem Fernseher zeigen/ }).click();
  const sheet = page.getByRole("dialog", { name: "Auf dem Fernseher zeigen" });
  await sheet.locator(".code input").first().fill(code);
  await sheet.getByRole("button", { name: "Verbinden" }).click();
  await expect(sheet.locator(".pill")).toHaveText(`Mit Fernseher ${code} verbunden`);
  await expect(tv.locator(".tv-card")).toHaveText(/Handy verbunden/);

  await sheet.locator(".card").first().click();
  await sheet.getByRole("button", { name: "Auf dem Fernseher zeigen", exact: true }).click();

  // Choosing the slideshow navigates this same tab away, to become the remote.
  await page.waitForURL(/\/r\//);
  await expect(tv.locator("html")).toHaveAttribute("data-state", "playing");

  const pauseButton = page.getByRole("button", { name: "Pause" });
  await expect(pauseButton).toBeVisible();
  await pauseButton.click();

  await expect(tv.locator("html")).toHaveAttribute("data-state", "paused");
  await expect(tv.locator(".tv-note")).toHaveText("Pausiert");
  await expect(page.getByRole("button", { name: "Abspielen" })).toBeVisible();
});

test("E2E-052 a guest on the share page scans the QR, and the remote pauses and skips the TV's slideshow", async ({
  page,
}) => {
  let jpeg: Uint8Array | null = null;
  const server = await fakeGlissandoServer(page, () => {
    if (jpeg === null) throw new Error("a photo was asked for before the case made one");
    return jpeg;
  });
  await openApp(page);
  jpeg = (await pictureTakenOn(page, "photo.jpg", "2019-07-02", "#4db6ac")).buffer;
  await createServerSlideshow(page);

  await chooseShareRow(page, /^Link teilen/);
  const sheet = page.getByRole("dialog", { name: "Per Link teilen" });
  await sheet.getByRole("button", { name: "Link erstellen" }).click();
  const link = sheet.getByRole("status", { name: "Link" });
  await expect(link).toHaveText(/\/s\/[\w-]{22}$/);
  const url = (await link.textContent()) ?? "";
  await sheet.getByRole("button", { name: "Fertig" }).click();

  // The "Control with your phone" button sits under the start card's own Play button, before
  // the slideshow plays: the remote's own Play starts it (dev-docs/tv_remote/TV_PAGE.md).
  const guest = await page.context().newPage();
  server.attachPage(guest);
  await guest.goto(url);
  await expect(guest.locator("html")).toHaveAttribute("data-state", "start");

  const linked = guest.waitForResponse(
    (response) =>
      response.request().method() === "POST" && /\/api\/share\/.*\/tv$/.test(response.url()),
  );
  await guest.getByRole("button", { name: "Mit dem Handy steuern" }).click();
  const { remoteSecret } = (await (await linked).json()) as { remoteSecret: string };

  const remote = await page.context().newPage();
  server.attachPage(remote);
  await remote.goto(`/r/${encodeURIComponent(remoteSecret)}`);
  await remote.getByRole("button", { name: "Abspielen" }).click();
  await expect(guest.locator("html")).toHaveAttribute("data-state", "playing");

  await remote.getByRole("button", { name: "Pause" }).click();
  await expect(guest.locator("html")).toHaveAttribute("data-state", "paused");
  await expect(remote.getByRole("button", { name: "Abspielen" })).toBeVisible();

  await remote.getByRole("button", { name: "Nächstes Bild" }).click();
  await expect(remote.locator(".line")).toHaveText("Bild 2 von 3 · Pausiert");
});
