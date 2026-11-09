import { describe, expect, it } from "vitest";
import { DRUMS, SILENT } from "../../library/testing/music-analysis-pass-fixtures";
import type { MusicAnalysisPass, MusicAnalysisPassState } from "../../library/music-analysis-pass";
import type { LibraryStore } from "../../library/library-store";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { ScreenMoodBpm } from "./screen-mood-bpm.svelte";

const IDLE_STATE: MusicAnalysisPassState = {
  running: false,
  listening: new Set(),
  found: new Map(),
  undecodable: new Set(),
};

function stored(songs: StoredSlideshow["songs"]): StoredSlideshow {
  return {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: [],
    secondsPerPicture: 5,
    songs,
  };
}

function screenMoodBpm(): ScreenMoodBpm {
  const pass: Pick<MusicAnalysisPass, "state" | "subscribe"> = {
    state: IDLE_STATE,
    subscribe: () => () => {},
  };
  const store: Pick<LibraryStore, "musicBeats"> = { musicBeats: async () => undefined };
  return new ScreenMoodBpm(pass, store, () => {});
}

describe("ScreenMoodBpm.beatsOf", () => {
  it("keeps the same map while the songs, the stored beats and the pass have not changed", () => {
    const bpm = screenMoodBpm();
    const show = stored([{ id: "a", fileName: "a.mp3", durationMs: 2000, mimeType: "audio/mpeg" }]);

    const first = bpm.beatsOf(show);
    const second = bpm.beatsOf(show);

    expect(second).toBe(first);
  });

  it("composes a new map once the songs change", () => {
    const bpm = screenMoodBpm();
    const oneSong = stored([
      { id: "a", fileName: "a.mp3", durationMs: 2000, mimeType: "audio/mpeg" },
    ]);
    const twoSongs = stored([
      { id: "a", fileName: "a.mp3", durationMs: 2000, mimeType: "audio/mpeg" },
      { id: "b", fileName: "b.mp3", durationMs: 2000, mimeType: "audio/mpeg" },
    ]);

    const first = bpm.beatsOf(oneSong);
    const second = bpm.beatsOf(twoSongs);

    expect(second).not.toBe(first);
    expect([...second.keys()]).toEqual(["a", "b"]);
  });

  it("composes a new map once the background pass finds a song's beats", () => {
    let notify: (next: MusicAnalysisPassState) => void = () => {};
    const pass: Pick<MusicAnalysisPass, "state" | "subscribe"> = {
      state: IDLE_STATE,
      subscribe: (onNext: (next: MusicAnalysisPassState) => void) => {
        notify = onNext;
        return () => {};
      },
    };
    const store: Pick<LibraryStore, "musicBeats"> = { musicBeats: async () => undefined };
    const bpm = new ScreenMoodBpm(pass, store, () => {});
    bpm.follow();
    const show = stored([{ id: "a", fileName: "a.mp3", durationMs: 2000, mimeType: "audio/mpeg" }]);

    const before = bpm.beatsOf(show);
    notify({ ...IDLE_STATE, found: new Map([["a", { beats: DRUMS, loudness: SILENT }]]) });
    const after = bpm.beatsOf(show);

    expect(after).not.toBe(before);
    expect(after.get("a")).toBe(DRUMS);
  });

  it("keeps the same map while the pass only moves on to listening to another song", () => {
    let notify: (next: MusicAnalysisPassState) => void = () => {};
    const pass: Pick<MusicAnalysisPass, "state" | "subscribe"> = {
      state: IDLE_STATE,
      subscribe: (onNext: (next: MusicAnalysisPassState) => void) => {
        notify = onNext;
        return () => {};
      },
    };
    const store: Pick<LibraryStore, "musicBeats"> = { musicBeats: async () => undefined };
    const bpm = new ScreenMoodBpm(pass, store, () => {});
    bpm.follow();
    const show = stored([
      { id: "a", fileName: "a.mp3", durationMs: 2000, mimeType: "audio/mpeg" },
      { id: "b", fileName: "b.mp3", durationMs: 2000, mimeType: "audio/mpeg" },
    ]);
    notify({ ...IDLE_STATE, running: true, listening: new Set(["a"]) });

    const before = bpm.beatsOf(show);
    notify({ ...IDLE_STATE, running: true, listening: new Set(["b"]) });
    const after = bpm.beatsOf(show);

    expect(after).toBe(before);
  });
});
