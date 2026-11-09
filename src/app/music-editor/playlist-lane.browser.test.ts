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

const song = (
  number: number,
  atMs: number,
  extra: Partial<PlaylistSongView> = {},
): PlaylistSongView => ({
  id: `song-${String(number)}`,
  number,
  fileName: `song ${String(number)}.mp3`,
  durationMs: 60_000,
  excerptMs: 60_000,
  trimmed: false,
  atMs,
  laneAtMs: atMs,
  laneMs: 60_000,
  reached: true,
  volumeBadge: { kind: "none" },
  ...extra,
});

/** Two songs with a long crossfade, so its hatching is wide enough to cover a number. */
const playlist: PlaylistView = {
  songs: [song(1, 0), song(2, 48_000)],
  songCount: 2,
  crossfade: true,
  crossfades: [{ atMs: 48_000, ms: 12_000 }],
  details: true,
  playlistMs: 108_000,
  slideshowMs: 108_000,
  slideChangesMs: [],
  repeatMusic: false,
};

function mount(view: PlaylistView) {
  const lane = mountWithTranslator(
    PlaylistLane,
    { playlist: view },
    { current: createTranslator("en") },
  );
  unmounts.push(lane.destroy);
  return lane;
}

describe("PlaylistLane", () => {
  it("keeps a song's number clear of the crossfade hatched at the start of its block", () => {
    const lane = mount(playlist);
    lane.target.style.width = "600px";

    const second = [...lane.target.querySelectorAll(".block")][1];
    const number = second?.querySelector(".number");
    const hatching = lane.target.querySelector(".crossfade");

    expect(number?.textContent).toBe("2");
    expect(number?.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      hatching?.getBoundingClientRect().right ?? Number.POSITIVE_INFINITY,
    );
  });

  it("carries no note and no buttons: the outcome line and the add control live elsewhere", () => {
    const lane = mount({ ...playlist, overMs: 12_000, fittedShareMs: 3_300 });

    expect(lane.target.querySelector(".fit-note")).toBeNull();
    expect(lane.target.querySelectorAll("button")).toHaveLength(0);
  });

  it("marks a repeated song's block and keys it by its start, not its song id", () => {
    const repeating: PlaylistView = {
      songs: [
        song(1, 0),
        song(2, 60_000),
        song(1, 120_000, { repeated: true }),
        song(2, 180_000, { repeated: true }),
      ],
      songCount: 2,
      crossfade: false,
      crossfades: [],
      details: true,
      playlistMs: 120_000,
      slideshowMs: 240_000,
      slideChangesMs: [],
      repeatMusic: true,
    };
    const lane = mount(repeating);

    const numbers = [...lane.target.querySelectorAll(".block .number")].map(
      (node) => node.textContent,
    );
    expect(numbers).toEqual(["1", "2", "1 ↻", "2 ↻"]);
  });

  it("hatches the crossfade across a repeat's loop boundary", () => {
    const repeating: PlaylistView = {
      songs: [song(1, 0), song(1, 60_000, { repeated: true })],
      songCount: 1,
      crossfade: true,
      crossfades: [{ atMs: 60_000, ms: 2_000 }],
      details: true,
      playlistMs: 60_000,
      slideshowMs: 120_000,
      slideChangesMs: [],
      repeatMusic: true,
    };
    const lane = mount(repeating);

    expect(lane.target.querySelectorAll(".crossfade")).toHaveLength(1);
  });

  it("labels a repeating playlist", () => {
    const repeating: PlaylistView = { ...playlist, slideshowMs: 200_000, repeatMusic: true };
    const lane = mount(repeating);

    expect(lane.target.textContent).toContain("Repeats until the slideshow ends");
  });

  describe("without the details", () => {
    const simple: PlaylistView = {
      ...playlist,
      songs: [
        song(1, 0, { laneMs: 54_000 }),
        song(2, 48_000, { laneAtMs: 54_000, laneMs: 54_000 }),
      ],
      crossfades: [],
      details: false,
    };

    it("draws no crossfade hatching and no label for it, but the numbers stay", () => {
      const lane = mount(simple);

      expect(lane.target.querySelectorAll(".block .number")).toHaveLength(2);
      expect(lane.target.querySelector(".crossfade")).toBeNull();
      expect(lane.target.textContent).not.toContain("Crossfades hatched");
      expect(lane.target.textContent).not.toContain("One after another");
    });

    it("lets the blocks meet at the middle of their overlap", () => {
      const lane = mount(simple);
      lane.target.style.width = "600px";

      const [first, second] = [...lane.target.querySelectorAll<HTMLElement>(".block")];

      expect(first?.getBoundingClientRect().right).toBeCloseTo(
        second?.getBoundingClientRect().left ?? Number.NaN,
        0,
      );
      expect(first?.classList.contains("meeting")).toBe(true);
    });
  });

  it("with the details, labels the crossfades as hatched", () => {
    const lane = mount(playlist);

    expect(lane.target.textContent).toContain("Crossfades hatched");
  });
});
