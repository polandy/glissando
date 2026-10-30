import { describe, expect, it } from "vitest";
import { SEQUENCE_BETWEEN_SONGS } from "../../library/own-music";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { playlistView } from "./playlist-view";

function song(id: string, durationMs: number, own: Partial<StoredMusic> = {}): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs, mimeType: "audio/mpeg", ...own };
}

function slideshow(songs: StoredMusic[], count: number, own: Partial<StoredSlideshow> = {}) {
  const pictures: StoredPicture[] = Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `p${index}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  }));
  return {
    id: "show",
    title: "Sommer",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    songs,
    ...own,
  } satisfies StoredSlideshow;
}

const SONGS = [
  song("a", 60_000),
  song("b", 90_000, { trim: { startMs: 10_000, endMs: 70_000 } }),
  song("c", 60_000),
];

function timedPictures(count: number, durationMs: number): StoredPicture[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `p${index}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    durationMs,
  }));
}

describe("playlistView, the details (MUSIC_EDITOR.md)", () => {
  it("without the details, draws no crossfades and cuts the blocks at the middle of each overlap", () => {
    const view = playlistView(slideshow(SONGS, 6), new Map(), new Map(), false);

    expect(view.details).toBe(false);
    expect(view.crossfades).toEqual([]);
    // Overlaps of 3 s at 57 s and 114 s: the first block ends at 58.5 s, the next starts there.
    expect(view.songs.map(({ laneAtMs, laneMs }) => [laneAtMs, laneAtMs + laneMs])).toEqual([
      [0, 58_500],
      [58_500, 115_500],
      [115_500, 174_000],
    ]);
  });

  it("without the details, leaves blocks that do not overlap as they are", () => {
    const view = playlistView(
      slideshow(SONGS, 6, { betweenSongs: SEQUENCE_BETWEEN_SONGS }),
      new Map(),
      new Map(),
      false,
    );

    expect(view.songs.map(({ laneAtMs, laneMs }) => [laneAtMs, laneMs])).toEqual([
      [0, 60_000],
      [60_000, 60_000],
      [120_000, 60_000],
    ]);
  });

  it("with the details, keeps each block at its own span", () => {
    const view = playlistView(slideshow(SONGS, 6), new Map(), new Map(), true);

    expect(view.details).toBe(true);
    expect(view.songs.map(({ laneAtMs, atMs }) => laneAtMs === atMs)).toEqual([true, true, true]);
  });

  it("without the details, also meets at the middle of a loop boundary", () => {
    const view = playlistView(
      slideshow([song("x", 20_000), song("y", 20_000)], 10, {
        repeatMusic: true,
        pictures: timedPictures(10, 5000),
      }),
      new Map(),
      new Map(),
      false,
    );

    expect(view.crossfades).toEqual([]);
    // Starts at 0, 17 s, 34 s, 51 s; each pair overlaps 3 s.
    expect(view.songs.map(({ laneAtMs }) => laneAtMs)).toEqual([0, 18_500, 35_500, 52_500]);
  });
});
