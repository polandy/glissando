import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { CAPTION_GLIDE_MS } from "../../player";
import { oneSlideShow } from "../../player/testing/browser-pictures";
import { OPENED_PICTURE_SHOW } from "../../player/testing/opened-pictures";
import { FakeScheduler } from "../testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { whenRendered } from "../testing/when-rendered";
import PlayerOverlay from "./PlayerOverlay.svelte";

let destroy = () => {};
afterEach(() => destroy());

async function openPlayer(musicTitle: string | null = null, caption?: string) {
  let closes = 0;
  const scheduler = new FakeScheduler();
  const show = await oneSlideShow();
  const slideshow =
    caption === undefined
      ? show
      : { ...show, slides: show.slides.map((slide) => ({ ...slide, caption })) };
  const mounted = mountWithTranslator(PlayerOverlay, {
    slideshow,
    musicTitle,
    onClose: () => (closes += 1),
    scheduler,
  });
  destroy = mounted.destroy;
  return { ...mounted, scheduler, closes: () => closes };
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

  it("tells screen readers the current slide's caption, politely, once it is open", async () => {
    const { target, scheduler } = await openPlayer(null, "Abends am Steg");

    scheduler.advance(0);
    flushSync();

    const region = target.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe("Abends am Steg");
    expect(region?.closest("[inert]")).toBeNull();
  });

  it("fades the controls in the time the caption glides with them", async () => {
    const { target } = await openPlayer();

    const ui = target.querySelector(".ui");
    expect(ui).not.toBeNull();
    expect(getComputedStyle(ui as Element).transitionDuration).toBe(`${CAPTION_GLIDE_MS / 1000}s`);
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
