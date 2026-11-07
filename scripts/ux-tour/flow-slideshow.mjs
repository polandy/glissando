export async function tourSlideshow({
  page,
  shot,
  B,
  wait,
  step,
  scrollDown,
  toTop,
  dismiss,
  fresh,
  tile,
}) {
  await step("more", async () => {
    await B("More").click();
    await shot("more-menu");
    await page.getByRole("menuitem", { name: /^Faces/ }).click();
    await wait(700);
    await shot("faces-subjects");
    await page.keyboard.press("Escape");
    await wait(300);
  });
  await fresh().catch(() => {});
  await step("rename", async () => {
    await B("Rename title").click();
    await wait(400);
    await shot("rename-title");
    await page.keyboard.type("Summer in the hills");
    await page.keyboard.press("Enter");
    await wait(400);
  });
  await fresh().catch(() => {});
  await step("title-slide", async () => {
    await B("Title slide").click();
    await wait(500);
    await shot("title-slide-editor");
    await B("Back", { exact: true })
      .click()
      .catch(() => {});
    await wait(400);
  });
  await fresh().catch(() => {});
  await step("add-media", async () => {
    await toTop();
    await B("Add media").click();
    await wait(500);
    await shot("add-media");
    await B("Back", { exact: true }).click();
    await wait(400);
  });
  // selection
  await fresh().catch(() => {});
  await step("select", async () => {
    await tile(3).scrollIntoViewIfNeeded();
    await tile(3).click();
    await wait(500);
    await shot("selection-bar");
  });
  await step("select-multi", async () => {
    await B("Select").click();
    await tile(4).click();
    await tile(5).click();
    await wait(300);
    await shot("selection-multi");
  });
  await step("viewer", async () => {
    await B("View full screen")
      .click()
      .catch(async () => {
        await B("Done").click();
        await tile(3).click();
        await B("View full screen").click();
      });
    await wait(700);
    await shot("viewer");
    await page.keyboard.press("ArrowRight");
    await wait(500);
    await shot("viewer-next");
    await page.keyboard.press("Escape");
    await wait(500);
  });
  await step("editor", async () => {
    if (!(await B("Edit picture").count())) await tile(3).click();
    await B("Edit picture").click();
    await wait(1000);
    await shot("editor-frame");
    await scrollDown();
    await wait(300);
    await shot("editor-frame-scrolled");
    await toTop();
    const hasModes = await B("Play", { exact: true }).count();
    if (hasModes) {
      await B("Play", { exact: true }).click();
    }
    await wait(800);
    await shot("editor-play");
    await scrollDown();
    await wait(300);
    await shot("editor-play-scrolled");
    await toTop();
    if (hasModes) await B("Frame", { exact: true }).click();
    await wait(300);
    await page.getByRole("textbox").first().fill("Evening on the jetty");
    await wait(400);
    await shot("editor-caption");
    await B("Back", { exact: true }).click();
    await wait(500);
  });
  await step("remove", async () => {
    await tile(6).click();
    await B("Remove picture").click();
    await wait(500);
    await shot("picture-removed-toast");
    const u = B("Undo");
    if (await u.count()) await u.click();
    await wait(300);
    const d = B("Done");
    if (await d.count()) await d.click();
  });
  await step("shuffle", async () => {
    await toTop();
    await B("Shuffle").click();
    await wait(500);
    await shot("shuffle-toast");
    await B("Undo").click();
    await wait(500);
    await shot("shuffle-undone");
    await dismiss();
  });
}
