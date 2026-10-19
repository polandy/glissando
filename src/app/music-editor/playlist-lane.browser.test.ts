import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import PlaylistLane from "./PlaylistLane.svelte";
import type { PlaylistSongView, PlaylistView } from "./playlist-view";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

const song = (number: number, atMs: number): PlaylistSongView => ({
  id: `song-${String(number)}`,
  number,
  fileName: `song ${String(number)}.mp3`,
  durationMs: 60_000,
  excerptMs: 60_000,
  trimmed: false,
  atMs,
  reached: true,
  volumeBadge: { kind: "none" },
});

/** Two songs with a long crossfade, so its hatching is wide enough to cover a number. */
const playlist: PlaylistView = {
  songs: [song(1, 0), song(2, 48_000)],
  crossfade: true,
  crossfades: [{ atMs: 48_000, ms: 12_000 }],
  playlistMs: 108_000,
  slideshowMs: 108_000,
  slideChangesMs: [],
};

describe("PlaylistLane", () => {
  it("keeps a song's number clear of the crossfade hatched at the start of its block", () => {
    const lane = mountWithTranslator(
      PlaylistLane,
      { playlist },
      { current: createTranslator("en") },
    );
    unmounts.push(lane.destroy);
    lane.target.style.width = "600px";

    const second = [...lane.target.querySelectorAll(".block")][1];
    const number = second?.querySelector(".number");
    const hatching = lane.target.querySelector(".crossfade");

    expect(number?.textContent).toBe("2");
    expect(number?.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      hatching?.getBoundingClientRect().right ?? Number.POSITIVE_INFINITY,
    );
  });
});
