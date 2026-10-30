import { expect, test } from "@playwright/test";
import {
  chooseCustomMood,
  chooseFiles,
  choosePictures,
  CREATED_TOAST,
  createSlideshow,
  editsStored,
  GERMAN_BROWSER,
  openImport,
  picturesTakenOn,
} from "./support/app";
import { openApp } from "./support/browser";
import { silentTrack } from "./support/media";

test.use(GERMAN_BROWSER);

const MORNING = "Morgenlied.wav";
const EVENING = "Abendlied.wav";
const NIGHT = "Nachtlied.wav";

test("E2E-041 several songs chosen in the import play as a playlist, reordered, handed over one after another, removed with undo and added to in the music editor", async ({
  page,
}) => {
  const back = page.getByRole("button", { name: "Zurück", exact: true });
  const songs = page.getByRole("list", { name: "Songs" });
  const songRows = songs.getByRole("listitem");
  const betweenSongs = page.getByRole("radiogroup", { name: "Zwischen den Songs" });
  const crossfade = betweenSongs.getByRole("radio", { name: "Überblenden" });
  const sequence = betweenSongs.getByRole("radio", { name: "Nacheinander" });
  await openApp(page);

  // A slideshow without music offers to add some, and the music editor opens on its empty state.
  await createSlideshow(page, ["2025-06-01", "2025-06-02"]);
  await page.getByRole("button", { name: "Musik Keine Musik hinzufügen" }).click();
  await expect(page.getByText("Noch keine Musik")).toBeVisible();
  await expect(page.getByRole("button", { name: "Song hinzufügen" })).toBeVisible();
  await expect(songs).toBeHidden();
  await back.click();
  await back.click();

  await openImport(page);
  await choosePictures(
    page,
    await picturesTakenOn(page, ["2025-07-12", "2025-07-14", "2025-07-20"]),
    3,
  );
  await page.getByRole("button", { name: "Weiter" }).click();
  await chooseFiles(page, page.getByRole("button", { name: "Dateien wählen" }), [
    silentTrack(MORNING, 8),
    silentTrack(EVENING, 6),
  ]);
  await expect(songRows).toHaveText([new RegExp(MORNING), new RegExp(EVENING)]);
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  // Calm's 21 s of pictures outlast the 11 s playlist, so the import step's own warning about that
  // is still leaving as the created toast arrives: scope past it like the other toasts below.
  await expect(page.getByRole("status").filter({ hasText: CREATED_TOAST })).toBeVisible();
  // A new slideshow opens on Calm (ADR-0050); this case is
  // about the playlist against the pictures' own pace, which a mood would override.
  await chooseCustomMood(page);

  // Two songs of 8 s and 6 s crossfade for 3 s: the playlist lasts 0:11.
  await page.getByRole("button", { name: "Musik 2 Songs" }).click();
  await expect(songRows).toHaveText([new RegExp(MORNING), new RegExp(EVENING)]);
  await expect(page.getByText("Playlist, 2 Songs · 0:11")).toBeVisible();

  await page.getByRole("button", { name: `${MORNING} verschieben` }).press("ArrowDown");
  await expect(songRows).toHaveText([new RegExp(EVENING), new RegExp(MORNING)]);

  await expect(crossfade).toHaveAttribute("aria-checked", "true");
  await sequence.click();
  await expect(sequence).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByText("Der nächste Song beginnt, wenn der vorige ausgeblendet hat."),
  ).toBeVisible();
  await expect(page.getByText("Playlist, 2 Songs · 0:14")).toBeVisible();
  await crossfade.click();
  await expect(crossfade).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Playlist, 2 Songs · 0:11")).toBeVisible();

  await page.getByRole("button", { name: `${MORNING} entfernen` }).click();
  const removedToast = page.getByRole("status").filter({ hasText: "Song entfernt" });
  await expect(removedToast).toBeVisible();
  await expect(songRows).toHaveText([new RegExp(EVENING)]);
  await removedToast.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(songRows).toHaveText([new RegExp(EVENING), new RegExp(MORNING)]);

  // With sample music on, "+ Add a song" opens a sheet with the own-music row inside it.
  await page.getByRole("button", { name: "Song hinzufügen" }).click();
  const addSongSheet = page.getByRole("dialog", { name: "Song hinzufügen" });
  await chooseFiles(page, addSongSheet.getByRole("button", { name: "Dateien wählen" }), [
    silentTrack(NIGHT, 5),
  ]);
  await addSongSheet.getByRole("button", { name: "Fertig" }).click();
  await expect(songRows).toHaveText([new RegExp(EVENING), new RegExp(MORNING), new RegExp(NIGHT)]);
  // 6 s, 8 s and 5 s with two crossfades of 3 s: 0:13.
  await expect(page.getByText("Playlist, 3 Songs · 0:13")).toBeVisible();
  await editsStored(page);

  await page.reload();
  await expect(songRows).toHaveText([new RegExp(EVENING), new RegExp(MORNING), new RegExp(NIGHT)]);
  await back.click();
  await expect(page.getByRole("button", { name: "Musik 3 Songs" })).toBeVisible();
});
