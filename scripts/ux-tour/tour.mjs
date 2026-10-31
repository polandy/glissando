import { launch, pictures, shotter, wav } from "./lib.mjs";
const kind = process.argv[2] ?? "phone";
const { browser, page } = await launch(kind);
const shot = shotter(page, kind, 0);
const B = (n, o = {}) => page.getByRole("button", { name: n, ...o });
const wait = (ms) => page.waitForTimeout(ms);
async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    console.log("FAILED", name, String(e.message).split("\n")[0]);
  }
}
async function scrollDown(frac = 0.8, top = false) {
  await page.evaluate(
    ([f, top]) => {
      const els = [document.scrollingElement, ...document.querySelectorAll("*")].filter(
        (e) =>
          e &&
          e.scrollHeight > e.clientHeight + 20 &&
          (e === document.scrollingElement ||
            ["auto", "scroll"].includes(getComputedStyle(e).overflowY)),
      );
      for (const e of els) e.scrollTop = top ? 0 : e.scrollTop + innerHeight * f;
    },
    [frac, top],
  );
}
const toTop = () => scrollDown(0, true);
async function pickPictures(n, size) {
  const ch = page.waitForEvent("filechooser");
  await B("Choose media").click();
  await (await ch).setFiles(await pictures(page, n, 1, size));
}
async function create(n, music) {
  await B("New slideshow").first().click();
  await pickPictures(n);
  await page.getByText(`${n} pictures`, { exact: true }).waitFor();
  await B("Next").click();
  if (music) {
    const c2 = page.waitForEvent("filechooser");
    await B("Choose files").click();
    await (
      await c2
    ).setFiles([{ name: "Summer Wind.wav", mimeType: "audio/wav", buffer: wav(40) }]);
    await page.getByText("Summer Wind.wav", { exact: true }).waitFor();
    await B("Create slideshow").click();
  } else await B("Create without music").click();
  await B("Fine settings").waitFor();
}
const dismiss = async () => {
  const d = B("Dismiss");
  if (await d.count())
    await d
      .first()
      .click()
      .catch(() => {});
  await wait(300);
};
async function fresh() {
  await page.goto("http://127.0.0.1:4173/");
  await wait(1000);
  await page
    .getByRole("button", { name: /\d+ pictures/ })
    .first()
    .click();
  await B("Fine settings").waitFor();
  await wait(500);
}
const BACK = () => B("Back", { exact: true }).click();

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
  await (await c2).setFiles([{ name: "Summer Wind.wav", mimeType: "audio/wav", buffer: wav(40) }]);
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
const tile = (n) => page.getByRole("button", { name: new RegExp(`^Picture ${n},`) });
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
await browser.close();
