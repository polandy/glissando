// Spec: docs/dev/library/SAMPLE_MUSIC.md
import { expect, test, type Page } from "@playwright/test";
import { chooseFiles, picturesTakenOn } from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";
import { LIBRARY_DATABASE_NAME } from "../src/library/indexeddb-store";

// English matches the sample-music catalogue strings this case asserts.
test.use({ locale: "en-GB" });

const PHONE = { width: 412, height: 780 };
const SAMPLE_MUSIC_BASE_URL = "https://polandy.github.io/glissando-assets/music/";
const STORED_TRACK_TITLE = "Hold the Frame";
const STORED_TRACK_MEDIA_ID = "sample-hold-the-frame";
const MUSIC_STORE = "music";

/** Puts a small track under the sample's media id, as a finished download would leave it. */
async function storeSampleTrackOnDevice(page: Page): Promise<void> {
  const bytes = Array.from(silentTrack("stored.wav", 2).buffer);
  await page.evaluate(
    ({ database, store, id, content }) =>
      new Promise<void>((resolve, reject) => {
        const opening = indexedDB.open(database);
        opening.onerror = () => reject(opening.error ?? new Error(`cannot open ${database}`));
        opening.onsuccess = () => {
          const transaction = opening.result.transaction(store, "readwrite");
          const record = { bytes: new Uint8Array(content).buffer, type: "audio/wav" };
          transaction.objectStore(store).put(record, id);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error ?? new Error("put failed"));
        };
      }),
    {
      database: LIBRARY_DATABASE_NAME,
      store: MUSIC_STORE,
      id: STORED_TRACK_MEDIA_ID,
      content: bytes,
    },
  );
}

test("E2E-140 offline, the sample-music block dims the tracks that are not on this device and still adds the one that is, without a download", async ({
  page,
  context,
}) => {
  const requestedUrls: string[] = [];
  await page.route(`${SAMPLE_MUSIC_BASE_URL}**`, (route) => {
    requestedUrls.push(route.request().url());
    return route.abort();
  });
  await openApp(page);
  await page.setViewportSize(PHONE);
  await storeSampleTrackOnDevice(page);
  await page.getByRole("button", { name: "New slideshow" }).first().click();
  await chooseFiles(
    page,
    page.getByRole("button", { name: "Choose pictures" }),
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14"]),
  );
  await expect(page.getByText("2 pictures", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Which music?" })).toBeVisible();

  const block = page.getByRole("region", { name: "Glissando music" });
  const cards = block.getByRole("list").first().getByRole("listitem");
  const storedCard = cards.filter({ hasText: STORED_TRACK_TITLE });
  const otherCards = cards.filter({ hasNotText: STORED_TRACK_TITLE });
  const offlineNotice = block.getByText("You are offline.");

  // Online first: the stored track says so, the others carry no status and offer their play button.
  await expect(storedCard.getByText("On this device")).toBeVisible();
  await expect(offlineNotice).toBeHidden();
  await expect(otherCards.getByText("Needs a connection")).toHaveCount(0);

  await context.setOffline(true);

  await expect(offlineNotice).toBeVisible();
  await expect(otherCards.getByText("Needs a connection")).toHaveCount(2);
  for (const card of await otherCards.all()) {
    await expect(card.getByRole("button", { name: /^Add / })).toBeDisabled();
    await expect(card.getByRole("button", { name: /^Play / })).toHaveCount(0);
  }
  await expect(storedCard.getByText("On this device")).toBeVisible();
  await expect(storedCard.getByRole("button", { name: /^Play / })).toBeVisible();

  // The stored track joins the Soundtrack list from the device.
  await storedCard.getByRole("button", { name: `Add ${STORED_TRACK_TITLE}` }).click();
  const soundtrack = page.getByRole("region", { name: "Music", exact: true });
  await expect(soundtrack.getByText(`${STORED_TRACK_TITLE}.mp3`)).toBeVisible();
  await expect(soundtrack.getByText("Sample", { exact: true })).toBeVisible();
  await expect(soundtrack.getByText("Couldn't download this song")).toBeHidden();
  expect(requestedUrls).toEqual([]);

  // Back online the notice goes and the other tracks are offered again.
  await context.setOffline(false);
  await expect(offlineNotice).toBeHidden();
  await expect(otherCards.getByText("Needs a connection")).toHaveCount(0);
  await expect(otherCards.first().getByRole("button", { name: /^Add / })).toBeEnabled();
});
