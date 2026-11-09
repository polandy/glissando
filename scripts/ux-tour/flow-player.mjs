export async function tourPlayer({
  page,
  shot,
  B,
  wait,
  step,
  scrollDown,
  toTop,
  create,
  dismiss,
  fresh,
  BACK,
}) {
  // player
  await fresh().catch(() => {});
  await step("player", async () => {
    await toTop();
    await B("Play", { exact: true }).first().click();
    await wait(700);
    await shot("player-start-controls");
    await wait(4000);
    await shot("player-running");
    await page.mouse.move(200, 400);
    await page.mouse.click(200, 400);
    await wait(500);
    await shot("player-after-tap");
    await page.keyboard.press("Space");
    await wait(500);
    await shot("player-paused");
    await page.keyboard.press("?");
    await wait(300);
    await shot("player-paused-2");
    await B(/^Close/).click();
    await wait(600);
  });
  await step("player-end", async () => {
    await B("Play", { exact: true }).first().click();
    await wait(500);
    const s = page.getByRole("slider", { name: "Position in the slideshow" });
    await s.evaluate((e) => {
      e.value = e.max;
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await wait(1200);
    await shot("player-seeked");
    await page.keyboard.press("Escape");
    await wait(500);
  });
  // delete dialog
  await fresh().catch(() => {});
  await step("delete", async () => {
    await B("More").click();
    await page.getByRole("menuitem", { name: /^Delete/ }).click();
    await wait(500);
    await shot("delete-confirm");
    await B("Keep").click();
    await wait(300);
  });
  // no-music slideshow, library
  await step("lib", async () => {
    await BACK();
    await wait(800);
    await create(6, false);
    await wait(500);
    await dismiss();
    await shot("slideshow-no-music");
    await page.getByRole("button", { name: /^Music/ }).click();
    await wait(1000);
    await shot("music-editor-no-music");
    await scrollDown();
    await wait(300);
    await shot("music-editor-no-music-2");
    await scrollDown();
    await wait(300);
    await shot("music-editor-no-music-3");
    await toTop();
    await step("sample-tile-play", async () => {
      const p = page.getByRole("button", { name: /^Play .+/ }).first();
      await p.click();
      await wait(800);
      await shot("music-sample-tile-playing");
    });
    await step("sample-tile-add", async () => {
      await page
        .getByRole("button", { name: /^Add (?!a song)/ })
        .first()
        .click();
      await wait(1500);
      await shot("music-sample-tile-added");
    });
    await BACK();
    await wait(500);
    await BACK();
    await wait(700);
    await create(5, true);
    await dismiss();
    await BACK();
    await wait(1200);
    await shot("start-library");
    await scrollDown();
    await wait(300);
    await shot("start-library-scrolled");
  });
  await step("lib-card-menu", async () => {
    await toTop();
    await page
      .getByRole("button", { name: /pictures/ })
      .first()
      .click();
    await wait(800);
    await shot("slideshow-reopened");
    await BACK();
    await wait(500);
  });
}
