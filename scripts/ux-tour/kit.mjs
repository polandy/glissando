import { pictures, wav } from "./lib.mjs";

export function createKit(page, shot) {
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

  const tile = (n) => page.getByRole("button", { name: new RegExp(`^Picture ${n},`) });
  return {
    page,
    shot,
    B,
    wait,
    step,
    scrollDown,
    toTop,
    pickPictures,
    create,
    dismiss,
    fresh,
    BACK,
    tile,
  };
}
