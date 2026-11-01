import { expect, test, type Route } from "@playwright/test";
import { chooseFiles, picturesTakenOn } from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";

/** Node's Buffer, as route.fulfill's body takes it; see support/media.ts for why this is local. */
declare const Buffer: { from(text: string, encoding: "utf8"): Uint8Array };

// Longer "Which music?" copy once widened the phone layout (music-formats.spec.ts); English
// matches the sample-music catalogue strings this case asserts.
test.use({ locale: "en-GB" });

// The import step's own phone screen (dev-docs/library/SAMPLE_MUSIC.md, "Where it shows").
const PHONE = { width: 412, height: 780 };

// The sample-music base URL every build defaults to (build/sample-music-config.ts); fetches to
// it are routed below so no byte of it leaves the machine.
const SAMPLE_MUSIC_BASE_URL = "https://polandy.github.io/glissando-assets/music/";
const FIRST_TRACK_TITLE = "Hold the Frame";

test.beforeEach(async ({ page }) => {
  // A download of any track gets a handful of bytes: far short of the catalogue's size, so the
  // size check fails before the hash is even checked (src/sample-music/sample-download.ts).
  await page.route(`${SAMPLE_MUSIC_BASE_URL}**`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      body: Buffer.from("wrong bytes", "utf8"),
    }),
  );
  await openApp(page);
  await page.setViewportSize(PHONE);
  await page.getByRole("button", { name: "New slideshow" }).first().click();
  await chooseFiles(
    page,
    page.getByRole("button", { name: "Choose pictures" }),
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14"]),
  );
  await expect(page.getByText("2 pictures", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Which music?" })).toBeVisible();
});

test("E2E-075 the sample-music block offers 9 tracks behind Show all, and a failed download leaves its card offered again next to an own file", async ({
  page,
}) => {
  const toggle = page.getByRole("button", { name: "Show all 9" });
  const soundtrack = page.locator(".soundtrack");
  // The first three cards sit directly in the block's own grid and stay rendered either way;
  // the other six sit inside ".more", which the accordion collapses to zero height (its cards
  // keep their own layout box under the clip, so visibility is asserted on ".more" itself, the
  // one element whose box genuinely collapses).
  const topCards = page.locator(".block > ul.grid > li.card");
  const more = page.locator(".more");
  const restCards = more.locator("li.card");

  // On entry: three cards show, the rest fold away.
  await expect(topCards).toHaveCount(3);
  await expect(more).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Your own music")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose files" })).toBeVisible();

  // Show all 9 (3 always rendered + the 6 the now-visible block reveals), then fold back.
  await toggle.click();
  const toggleOpen = page.getByRole("button", { name: "Show fewer" });
  await expect(toggleOpen).toHaveAttribute("aria-expanded", "true");
  await expect(more).toBeVisible();
  await expect(restCards).toHaveCount(6);
  await toggleOpen.click();
  await expect(more).toBeHidden();

  // Adding a track downloads it; the wrong bytes routed above fail its size check.
  await page.getByRole("button", { name: `Add ${FIRST_TRACK_TITLE}` }).click();
  await expect(soundtrack.getByText(FIRST_TRACK_TITLE)).toBeVisible();
  await expect(soundtrack.getByText("Couldn't download this song")).toBeVisible();
  await expect(page.getByRole("button", { name: `Add ${FIRST_TRACK_TITLE}` })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // An own file joins the same Soundtrack list, independently of the failed sample row.
  await chooseFiles(page, page.getByRole("button", { name: "Choose files" }), [
    silentTrack("My Own Song.wav", 5),
  ]);
  await expect(soundtrack.getByText("My Own Song.wav", { exact: true })).toBeVisible();
});

test.describe("on a phone, in the music editor's Add song sheet", () => {
  // Three cards of about 85 px in the sheet at this size: a real tap must still land on a
  // card's +.
  const PHONE_TOUCH = { width: 390, height: 844 };
  test.use({ hasTouch: true, isMobile: true, viewport: PHONE_TOUCH });

  test.beforeEach(async ({ page }) => {
    // Narrower than the phone screen the file's own beforeEach sets.
    await page.setViewportSize(PHONE_TOUCH);
  });

  test("E2E-084 tapping a sample track's + adds it to a slideshow that started without music", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Create without music" }).click();
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Music None Add music" }).click();
    await expect(page.getByText("No music yet")).toBeVisible();

    await page.getByRole("button", { name: "Add a song" }).click();
    const addSongSheet = page.getByRole("dialog", { name: "Add a song" });
    await expect(addSongSheet).toBeVisible();

    // A real tap, unforced: Playwright's hit-target check fails it if anything covers the +. The route above fails the download fast, so the pressed "Remove" state can
    // flip back to "Add" before an assertion catches it; the song joining the list is the one
    // signal that survives whichever way the download lands.
    await addSongSheet.getByRole("button", { name: `Add ${FIRST_TRACK_TITLE}` }).tap();
    await addSongSheet.getByRole("button", { name: "Done" }).click();
    await expect(
      page.getByRole("list", { name: "Songs" }).getByText(FIRST_TRACK_TITLE),
    ).toBeVisible();
  });
});
