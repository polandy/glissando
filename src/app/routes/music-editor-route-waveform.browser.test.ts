import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { MusicLoudness } from "../../loudness";
import type { MemoryLibraryStore } from "../../library/testing/memory-store";
import {
  FakeAnalysisPass,
  TWO_SONGS,
  mountRoute,
  unmountRoute,
} from "./music-editor-route-harness";

afterEach(() => unmountRoute());

/** A song that is quiet for its first half and loud for its second. */
const QUIET_THEN_LOUD: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01]),
  hopPeaks: Float32Array.from({ length: 200 }, (_, hop) => (hop < 100 ? 0.1 : 0.4)),
};

const READING_TEXT = "Song wird gelesen …";
const UNDECODABLE_HINT = "die Lautheit dieses Songs nicht heraushören";

/**
 * The route's store reads of stored loudness, so a test can wait for them instead of a timer;
 * the stored loudness `m1` has meanwhile, if any, is set before the route reads it.
 */
function watchLoudnessReads(store: MemoryLibraryStore, stored?: MusicLoudness) {
  const reads: Promise<unknown>[] = [];
  const read = store.musicLoudness.bind(store);
  store.musicLoudness = (musicId) => {
    const result = read(musicId);
    reads.push(result);
    return result;
  };
  if (stored !== undefined) void store.putMusicLoudness("m1", stored);
  return async () => {
    await Promise.all(reads);
    flushSync();
  };
}

/** Whether the bars differ in height, as a label: a failing assertion never prints decoded audio. */
function barShape(target: HTMLElement): "varied" | "flat" | "none" {
  const heights = new Set(
    [...target.querySelectorAll(".bars rect")].map((bar) => bar.getAttribute("height")),
  );
  if (heights.size === 0) return "none";
  return heights.size > 1 ? "varied" : "flat";
}

describe("the music editor route's waveform", () => {
  it("draws the selected song's waveform from its stored loudness", async () => {
    let readLoudness = async () => {};
    const { target } = await mountRoute(undefined, (store) => {
      readLoudness = watchLoudnessReads(store, QUIET_THEN_LOUD);
      return new FakeAnalysisPass();
    });

    await readLoudness();

    expect(target.querySelector(".reading")).toBeNull();
    expect(barShape(target)).toBe("varied");
  });

  it("reads until the pass finds the song's loudness, then draws it", async () => {
    const pass = new FakeAnalysisPass();
    let readLoudness = async () => {};
    const { target } = await mountRoute(undefined, (store) => {
      readLoudness = watchLoudnessReads(store);
      return pass;
    });
    await readLoudness();
    expect(target.querySelector(".reading")?.textContent).toBe(READING_TEXT);

    pass.publish({
      found: new Map([["m1", { beats: { kind: "none" }, loudness: QUIET_THEN_LOUD }]]),
    });
    flushSync();

    expect(target.querySelector(".reading")).toBeNull();
    expect(barShape(target)).toBe("varied");
  });

  it("keeps reading, without an error, for a song this device cannot decode", async () => {
    const pass = new FakeAnalysisPass();
    let readLoudness = async () => {};
    const { target, errors } = await mountRoute(undefined, (store) => {
      readLoudness = watchLoudnessReads(store);
      return pass;
    });
    await readLoudness();

    pass.publish({ undecodable: new Set(["m1"]) });
    flushSync();

    expect(target.textContent).toContain(UNDECODABLE_HINT);
    expect(target.querySelector(".reading")?.textContent).toBe(READING_TEXT);
    expect(errors).toEqual([]);
  });

  it("asks the pass to listen for a song when it is selected", async () => {
    const pass = new FakeAnalysisPass();
    const { target, loaded, store } = await mountRoute(TWO_SONGS, () => pass);
    await store.putMusic("m2", new Blob(["second song"], { type: "audio/mpeg" }));
    await loaded(0);
    const askedBefore = pass.listenedFor.length;

    target.querySelectorAll<HTMLButtonElement>(".song .pick")[1]?.click();
    flushSync();
    await loaded(1);

    expect(target.querySelector(".song-heading")?.textContent).toContain("Low Tide.mp3");
    expect(pass.listenedFor.slice(askedBefore)).toEqual(["m2"]);
  });
});
