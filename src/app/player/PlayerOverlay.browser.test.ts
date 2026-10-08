import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { oneSlideShow } from "../../player/testing/browser-pictures";
import { OPENED_PICTURE_SHOW } from "../../player/testing/opened-pictures";
import { FakeScheduler } from "../testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import PlayerOverlay from "./PlayerOverlay.svelte";

let destroy = () => {};
afterEach(() => destroy());

async function openPlayer(musicTitle: string | null = null) {
  let closes = 0;
  const mounted = mountWithTranslator(PlayerOverlay, {
    slideshow: await oneSlideShow(),
    musicTitle,
    onClose: () => (closes += 1),
    scheduler: new FakeScheduler(),
  });
  destroy = mounted.destroy;
  return { ...mounted, closes: () => closes };
}

/** Resolves with the first element matching `selector` in `target`, once it is rendered. */
function whenRendered(target: HTMLElement, selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const found = () => target.querySelector(selector);
    const observer = new MutationObserver(() => {
      const element = found();
      if (element !== null) {
        observer.disconnect();
        resolve(element);
      }
    });
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    const already = found();
    if (already !== null) {
      observer.disconnect();
      resolve(already);
    }
  });
}

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
  flushSync();
}

function playButton(target: HTMLElement): HTMLButtonElement {
  const found = target.querySelector<HTMLButtonElement>("button.play");
  if (found === null) {
    throw new Error("the player has no play/pause button");
  }
  return found;
}

describe("PlayerOverlay", () => {
  it("starts playing on open and shows the picture counter", async () => {
    const { target } = await openPlayer();

    expect(target.querySelector(".counter")?.textContent).toBe("1 / 1");
    expect(playButton(target).getAttribute("aria-label")).toBe("Pause");
  });

  it("pauses and plays again with the space bar", async () => {
    const { target } = await openPlayer();

    press(" ");
    expect(playButton(target).getAttribute("aria-label")).toBe("Abspielen");
    press(" ");
    expect(playButton(target).getAttribute("aria-label")).toBe("Pause");
  });

  it("closes with Esc and with ✕", async () => {
    const { target, closes } = await openPlayer();

    press("Escape");
    target.querySelector<HTMLButtonElement>('button[aria-label="Schließen (Esc)"]')?.click();

    expect(closes()).toBe(2);
  });

  it("shows the music title only when there is music", async () => {
    const withMusic = await openPlayer("Sommer am See.mp3");
    expect(withMusic.target.querySelector(".music")?.textContent).toContain("Sommer am See.mp3");
    destroy();

    const withoutMusic = await openPlayer();
    expect(withoutMusic.target.querySelector(".counter")).not.toBeNull();
    expect(withoutMusic.target.querySelector(".music")).toBeNull();
  });

  it("frees the player's drawing surface when it closes", async () => {
    const { target } = await openPlayer();
    const stage = target.querySelector(".stage");
    expect(stage?.childElementCount).toBeGreaterThan(0);

    destroy();

    expect(stage?.childElementCount).toBe(0);
  });

  it("says a picture could not be loaded when opening it fails", async () => {
    const opened: string[] = [];
    const mounted = mountWithTranslator(PlayerOverlay, {
      slideshow: OPENED_PICTURE_SHOW,
      openPicture: (src: string) => {
        opened.push(src);
        return Promise.reject(new Error("the picture is gone from storage"));
      },
      onClose: () => undefined,
      scheduler: new FakeScheduler(),
    });
    destroy = mounted.destroy;

    const alert = await whenRendered(mounted.target, "[role=alert]");

    expect(opened).toContain(OPENED_PICTURE_SHOW.slides[0]?.image.src);
    expect(alert.textContent).toContain("Ein Bild konnte nicht geladen werden.");
  });
});
