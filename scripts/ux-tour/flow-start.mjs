import { wav } from "./lib.mjs";

export async function tourStart({
  page,
  shot,
  B,
  wait,
  step,
  scrollDown,
  toTop,
  pickPictures,
  dismiss,
  fresh,
}) {
  await page.goto("http://127.0.0.1:4173/");
  await wait(1500);
  await shot("start-empty");
  await step("start-settings-empty", async () => {
    await B("Settings").click();
    await wait(500);
    await shot("settings");
    await scrollDown();
    await wait(300);
    await shot("settings-scrolled");
    await page.getByRole("radio", { name: "Dark" }).click();
    await wait(300);
    await shot("settings-dark-selected");
    await page.getByRole("radio", { name: /^Light/ }).click();
    await B("Close").click();
    await wait(400);
  });
  await step("open-file-error", async () => {
    const ch = page.waitForEvent("filechooser");
    await B(/Open .*file|Open file/)
      .first()
      .click();
    await (
      await ch
    ).setFiles([
      { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a glissando file") },
    ]);
    await wait(1000);
    await shot("open-file-error");
    await dismiss();
  });

  // import flow
  await B("New slideshow").first().click();
  await wait(400);
  await shot("new-pictures-empty");
  await step("adding", async () => {
    await pickPictures(30, [3000, 2000]);
    await wait(300);
    await shot("new-pictures-adding");
    await page.getByText("30 pictures", { exact: true }).waitFor({ timeout: 90000 });
  });
  await shot("new-pictures-added");
  await step("sel", async () => {
    await B("Select").click();
    await wait(300);
    await shot("new-pictures-select-mode");
    await B("Done").click();
  });
  await B("Next").click();
  await wait(800);
  await shot("new-music-step");
  await scrollDown();
  await wait(300);
  await shot("new-music-step-scrolled");
  await step("show-all", async () => {
    await toTop();
    await B(/^Show all/).click();
    await wait(300);
    await shot("new-music-show-all");
  });
  await step("sample-add", async () => {
    await B(/^Add Hold the Frame/).click();
    await wait(800);
    await shot("new-music-sample-added");
  });
  await step("music-pick", async () => {
    const c2 = page.waitForEvent("filechooser");
    await B("Choose files").click();
    await (
      await c2
    ).setFiles([{ name: "Summer Wind.wav", mimeType: "audio/wav", buffer: wav(40) }]);
    await page.getByText("Summer Wind.wav", { exact: true }).waitFor();
    await shot("new-music-own-file-added");
  });
  await step("back-pictures", async () => {
    await B("Pictures", { exact: true }).click();
    await wait(400);
    await shot("new-back-to-pictures");
    await B("Next").click();
    await wait(500);
  });
  await B(/^Create slideshow|Create without music/)
    .first()
    .click();
  await B("Fine settings").waitFor();
  await wait(600);
  await shot("slideshow-created-toast");
  await dismiss();
  await shot("slideshow-top");
  await step("slideshow-hover-strip", async () => {
    await scrollDown(0.7);
    await wait(300);
    await shot("slideshow-strip");
    await toTop();
  });
  await B("Fine settings").click();
  await wait(300);
  await shot("slideshow-fine-open");
  await step("fine-sub", async () => {
    for (const n of ["Transitions", "Portrait pictures", "Trip chapters"]) {
      await step(n, async () => {
        await page.getByRole("button", { name: new RegExp("^" + n) }).click();
        await wait(600);
        await shot("fine-" + n.toLowerCase().replace(" ", "-"));
        await page.keyboard.press("Escape");
        await wait(500);
        if (await page.getByRole("heading", { name: /transition|portrait|chapter/i }).count())
          await shot("sheet-still-open");
      });
    }
  });
  await toTop();
  await fresh().catch(() => {});
}
