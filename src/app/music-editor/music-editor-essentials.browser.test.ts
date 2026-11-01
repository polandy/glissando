import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import "../../styles/tokens.css";
import "../../styles/base.css";
import { OWN_SECONDS_PICTURE_LENGTH } from "../../library/picture-length";
import {
  detailsSwitch,
  hiddenDetailsStore,
  mountEditor,
  slideshowOfSongs,
  song,
  unmountEditor,
} from "./music-editor-harness";

afterEach(() => unmountEditor());

const TWO = [song("a", 60_000), song("b", 60_000)];
/** What only the Details show: the lane, the song's waveform and Listen buttons, its settings. */
const DETAILS_ONLY = [
  ".playlist-timeline",
  ".wavebox",
  ".listen",
  ".song-heading",
  '[aria-labelledby="music-excerpt"]',
  '[aria-labelledby="music-volume"]',
  '[aria-labelledby="music-picture-changes"]',
  '[aria-labelledby="music-fade-in"]',
  '[aria-labelledby="music-fade-out"]',
  '[aria-labelledby="music-between-songs"]',
];
const repeatSwitch = () =>
  document.querySelector<HTMLInputElement>('input[role="switch"][aria-label="Musik wiederholen"]');
const notice = () => document.querySelector<HTMLElement>(".length-notice");
const addButtons = () =>
  [...document.querySelectorAll("button")].filter((button) =>
    button.textContent?.includes("Song hinzufügen"),
  );

describe("MusicEditorScreen, the Essentials", () => {
  it("shows only the songs, the picture length, repeat and the one-line notice", () => {
    mountEditor(slideshowOfSongs(TWO), undefined, undefined, undefined, hiddenDetailsStore());

    expect(detailsSwitch()?.checked).toBe(false);
    expect(document.querySelectorAll(".songs .song")).toHaveLength(2);
    expect(document.querySelector('[aria-labelledby="music-picture-length"]')).not.toBeNull();
    expect(repeatSwitch()).not.toBeNull();
    expect(notice()).not.toBeNull();
    for (const selector of DETAILS_ONLY) {
      expect(document.querySelector(selector), selector).toBeNull();
    }
  });

  it("adds the lane, the selected song and its settings, and Between songs, with Details on", () => {
    mountEditor(slideshowOfSongs(TWO), undefined, undefined, undefined, hiddenDetailsStore());

    detailsSwitch()?.click();
    flushSync();

    for (const selector of DETAILS_ONLY) {
      expect(document.querySelector(selector), selector).not.toBeNull();
    }
    expect(repeatSwitch()).not.toBeNull();
  });
});

describe("MusicEditorScreen, one notice and one add control", () => {
  /** A 40 s song under 24 pictures of 5 s: the music ends well before the pictures. */
  const shortMusic = () =>
    slideshowOfSongs([song("a", 40_000)], {
      count: 24,
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
      secondsPerPicture: 5,
    });

  it("has exactly one Add a song control while the music ends before the pictures", () => {
    mountEditor(shortMusic(), undefined, undefined, undefined, hiddenDetailsStore());

    expect(notice()?.textContent).toContain("Die Musik endet");
    expect(addButtons()).toHaveLength(1);
    expect(document.querySelector(".songs")?.contains(addButtons()[0] ?? null)).toBe(true);
  });

  it("has exactly one Add a song control with Details on, too", () => {
    mountEditor(shortMusic());

    expect(notice()).not.toBeNull();
    expect(addButtons()).toHaveLength(1);
  });

  it("turns the repeat on from the notice's one link", () => {
    const { calls } = mountEditor(
      shortMusic(),
      undefined,
      undefined,
      undefined,
      hiddenDetailsStore(),
    );

    const link = [...(notice()?.querySelectorAll("button") ?? [])];
    expect(link.map((button) => button.textContent?.trim())).toEqual(["Musik wiederholen"]);
    link[0]?.click();

    expect(calls.repeatMusic).toEqual([true]);
  });
});

describe("MusicEditorScreen, the Essentials on a phone", () => {
  const PHONE = { width: 390, height: 844 };
  const SCREENS = 2;

  it("fits two songs in at most two screens", async () => {
    await page.viewport(PHONE.width, PHONE.height);
    mountEditor(slideshowOfSongs(TWO), undefined, undefined, undefined, hiddenDetailsStore());

    const screen = document.querySelector<HTMLElement>(".screen");
    expect(screen?.scrollHeight).toBeLessThanOrEqual(SCREENS * PHONE.height);
  });
});
