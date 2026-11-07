export async function tourEditors({ page, shot, B, wait, step, scrollDown, toTop, fresh, BACK }) {
  // music editor with music
  await toTop();
  await fresh().catch(() => {});
  await step("music", async () => {
    await page.getByRole("button", { name: /^Music/ }).click();
    await wait(1200);
    await shot("music-editor-essentials");
    await scrollDown();
    await wait(300);
    await shot("music-editor-essentials-2");
    await scrollDown();
    await wait(300);
    await shot("music-editor-essentials-3");
    await toTop();
    await page.getByRole("switch", { name: "Details" }).evaluate((e) => e.click());
    await wait(800);
    await shot("music-editor-details");
    await scrollDown();
    await wait(300);
    await shot("music-editor-details-2");
    await scrollDown();
    await wait(300);
    await shot("music-editor-details-3");
    await scrollDown();
    await wait(300);
    await shot("music-editor-details-4");
    await toTop();
    await step("add-song", async () => {
      await B("Add a song").first().click();
      await wait(700);
      await shot("music-add-song");
      await page.keyboard.press("Escape");
      await wait(400);
    });
    await BACK();
    await wait(500);
  });
  await fresh().catch(() => {});
  await step("mood", async () => {
    await page.getByRole("button", { name: /^Mood/ }).click();
    await wait(500);
    await shot("mood-sheet");
    await page.getByRole("radio", { name: /^Lively/ }).click();
    await wait(400);
    await shot("mood-lively");
    await page.getByRole("radio", { name: /^Custom/ }).click();
    await wait(400);
    await shot("mood-custom");
    await B("Done").click();
    await wait(400);
  });
  await fresh().catch(() => {});
  await step("look", async () => {
    await page.getByRole("button", { name: /^Look/ }).click();
    await wait(600);
    await shot("look-sheet");
    await page.getByRole("radio", { name: "Film" }).click();
    await wait(500);
    await shot("look-film");
    await B("Done").click();
    await wait(400);
  });
  // share
  await fresh().catch(() => {});
  await step("share", async () => {
    await toTop();
    await B("Share").click();
    await wait(500);
    await shot("share-list");
    for (const [n, f] of [
      ["Video", "video"],
      ["Web page", "web-page"],
      ["Glissando file", "glissando-file"],
    ]) {
      await step(n, async () => {
        await page.getByRole("button", { name: new RegExp("^" + n) }).click();
        await wait(700);
        await shot("share-" + f);
        if (f === "web-page") {
          await B("Create web page").click();
          await wait(1500);
          await shot("share-web-page-working");
          await wait(3000);
          await shot("share-web-page-done");
        }
        if (f === "video") {
          await B("Create video").click();
          await wait(1500);
          await shot("share-video-working");
          const c = B("Cancel");
          if (await c.count()) await c.click();
          await wait(500);
        }
        await page.keyboard.press("Escape");
        await wait(500);
        if (!(await page.getByRole("button", { name: /^Web page/ }).count()))
          await B("Share").click();
        await wait(400);
      });
    }
    await page.keyboard.press("Escape");
    await wait(500);
  });
  await step("share-close", async () => {
    const c = B("Close");
    if (await c.count()) await c.first().click();
    await wait(400);
  });
}
