import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { BeatsStatus } from "../beats/music-beats-known";
import { createMemoryStorage } from "../testing/memory-storage";
import { createStorageMusicEditorDetailsStore } from "./music-editor-details";
import {
  detailsSwitch,
  hiddenDetailsStore,
  mountEditor,
  slideshowOfSongs,
  slideshowWith,
  song,
  text,
  TRACK_MS,
  unmountEditor,
} from "./music-editor-harness";

afterEach(() => unmountEditor());

/** The editor as a first visit finds it: Details off. */
function mountHidden(
  slideshow: Parameters<typeof mountEditor>[0],
  beats?: Parameters<typeof mountEditor>[1],
  loudness?: Parameters<typeof mountEditor>[2],
) {
  return mountEditor(slideshow, beats, loudness, undefined, hiddenDetailsStore());
}

const TWO = [song("a", 60_000), song("b", 60_000)];
/** A beat every 500 ms across the whole track. */
const FOUND: BeatsStatus = {
  kind: "known",
  beats: {
    kind: "beats",
    beatsMs: Array.from({ length: TRACK_MS / 500 }, (_, beat) => 250 + beat * 500),
    beatsPerMinute: 120,
  },
};

const toggle = (): void => {
  detailsSwitch()?.click();
  flushSync();
};
const envelope = () => document.querySelector(".wavebox .envelope");
const slideshowLane = () => document.querySelector(".wavebox .runs");
const hatching = () => document.querySelector(".playlist-lane .crossfade");

describe("MusicEditorScreen, the Details switch", () => {
  it("is off by default and shows the simple editor: the lane without crossfades", () => {
    mountHidden(slideshowOfSongs(TWO), FOUND);

    expect(detailsSwitch()?.checked).toBe(false);
    expect(document.querySelector(".songs")).not.toBeNull();
    expect(document.querySelector(".playlist-lane")).not.toBeNull();
    expect(document.querySelector(".wave")).toBeNull();
    expect(envelope()).toBeNull();
    expect(document.querySelector(".beat-ticks")).toBeNull();
    expect(slideshowLane()).toBeNull();
    expect(hatching()).toBeNull();
    expect(text(".playlist-timeline .lane-label")).not.toContain("Überblendungen");
  });

  it("shows the volume line, beat ticks, slideshow lane, hatching and full hint when on", () => {
    mountHidden(slideshowOfSongs(TWO), FOUND);

    toggle();

    expect(detailsSwitch()?.checked).toBe(true);
    expect(envelope()).not.toBeNull();
    expect(document.querySelector(".beat-ticks")).not.toBeNull();
    expect(slideshowLane()).not.toBeNull();
    expect(hatching()).not.toBeNull();
    expect(text(".playlist-timeline .lane-label")).toContain("Überblendungen schraffiert");
    expect(text(".pop")).toContain("orange Linie");

    toggle();

    expect(envelope()).toBeNull();
    expect(hatching()).toBeNull();
  });

  it("turns on from a tap on its visible word, too", () => {
    mountHidden(slideshowOfSongs(TWO), FOUND);
    const word = [...document.querySelectorAll<HTMLElement>(".screen *")].find(
      (element) => element.children.length === 0 && element.textContent === "Details",
    );
    expect(word).toBeDefined();

    word?.click();
    flushSync();

    expect(detailsSwitch()?.checked).toBe(true);
    expect(envelope()).not.toBeNull();
  });

  it("shows no waveform, playhead or time chip while listening with Details off", () => {
    const { set } = mountHidden(slideshowWith());

    set({ listening: { kind: "start", positionMs: 30_000 } });

    expect(document.querySelector(".wavebox")).toBeNull();
  });

  it("is remembered on this device across a remount", () => {
    const storage = createMemoryStorage();
    mountEditor(
      slideshowWith(),
      undefined,
      undefined,
      undefined,
      createStorageMusicEditorDetailsStore(storage),
    );
    toggle();
    unmountEditor();

    mountEditor(
      slideshowWith(),
      undefined,
      undefined,
      undefined,
      createStorageMusicEditorDetailsStore(storage),
    );

    expect(detailsSwitch()?.checked).toBe(true);
    expect(envelope()).not.toBeNull();
  });

  it("is not offered without music", () => {
    mountHidden({ ...slideshowWith(), songs: [] });

    expect(text(".empty")).toContain("Noch keine Musik");
    expect(detailsSwitch()).toBeNull();
  });
});
