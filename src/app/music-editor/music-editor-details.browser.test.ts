import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { BeatsStatus } from "../beats/music-beats-known";
import { createMemoryStorage } from "../testing/memory-storage";
import { createStorageMusicEditorDetailsStore } from "./music-editor-details";
import {
  detailsSwitch,
  mountEditor,
  slideshowOfSongs,
  slideshowWith,
  song,
  text,
  TRACK_MS,
  unmountEditor,
} from "./music-editor-harness";

afterEach(() => unmountEditor());

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
  it("is off by default and shows the simple editor", () => {
    mountEditor(slideshowOfSongs(TWO), FOUND);

    expect(detailsSwitch()?.checked).toBe(false);
    expect(document.querySelector(".songs")).not.toBeNull();
    expect(document.querySelectorAll(".playlist-lane .block")).toHaveLength(2);
    expect(document.querySelector(".wave .handle.start")).not.toBeNull();
    expect(document.querySelector(".wave .handle.end")).not.toBeNull();
    expect(envelope()).toBeNull();
    expect(document.querySelector(".beat-ticks")).toBeNull();
    expect(slideshowLane()).toBeNull();
    expect(hatching()).toBeNull();
    expect(text(".playlist-timeline .lane-label")).not.toContain("Überblendungen");
    expect(text(".hint")).not.toContain("orange");
  });

  it("shows the volume line, beat ticks, slideshow lane, hatching and full hint when on", () => {
    mountEditor(slideshowOfSongs(TWO), FOUND);

    toggle();

    expect(detailsSwitch()?.checked).toBe(true);
    expect(envelope()).not.toBeNull();
    expect(document.querySelector(".beat-ticks")).not.toBeNull();
    expect(slideshowLane()).not.toBeNull();
    expect(hatching()).not.toBeNull();
    expect(text(".playlist-timeline .lane-label")).toContain("Überblendungen schraffiert");
    expect(text(".hint")).toContain("orange Linie");

    toggle();

    expect(envelope()).toBeNull();
    expect(hatching()).toBeNull();
  });

  it("turns on from a tap on its visible word, too", () => {
    mountEditor(slideshowOfSongs(TWO), FOUND);
    const word = [...document.querySelectorAll<HTMLElement>(".screen *")].find(
      (element) => element.children.length === 0 && element.textContent === "Details",
    );
    expect(word).toBeDefined();

    word?.click();
    flushSync();

    expect(detailsSwitch()?.checked).toBe(true);
    expect(envelope()).not.toBeNull();
  });

  it("keeps the playhead and the time chip over the simple waveform while listening", () => {
    const { set } = mountEditor(slideshowWith());

    set({ listening: { kind: "start", positionMs: 30_000 } });

    expect(document.querySelector(".wavebox .playhead")).not.toBeNull();
    expect(document.querySelector(".wavebox .chip")).not.toBeNull();
    expect(slideshowLane()).toBeNull();
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
    mountEditor({ ...slideshowWith(), songs: [] });

    expect(text(".empty")).toContain("Noch keine Musik");
    expect(detailsSwitch()).toBeNull();
  });
});
