import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../../beats";
import { EVEN_PICTURE_CHANGES, SEQUENCE_BETWEEN_SONGS } from "../../library/own-music";
import type { StoredMusic } from "../../library/stored-slideshow";
import { NO_SONG_BEATS, type Playlist, type SongBeats } from "../playlist";
import { NO_SONG_LOUDNESS, type SongLoudness } from "../song-loudness";
import { levelMs, syntheticLoudness } from "./testing/synthetic-loudness";
import { NEUTRAL_ENERGY } from "./energy-curve";
import { playlistEnergy } from "./playlist-energy";

// Close enough together that the relative gate (10 LU) never excludes the quieter passage from
// the excerpt's integrated loudness, so both passages still read on either side of neutral.
const QUIET_LUFS = -24;
const LOUD_LUFS = -16;

function song(id: string, durationMs: number, own: Partial<StoredMusic> = {}): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs, mimeType: "audio/mpeg", ...own };
}

function loudnessOf(...entries: readonly [string, number[]][]): SongLoudness {
  return new Map(entries.map(([id, lufsLevels]) => [id, syntheticLoudness(lufsLevels)]));
}

function beatsOf(id: string, beatsMs: readonly number[]): SongBeats {
  const beats: MusicBeats = { kind: "beats", beatsMs, beatsPerMinute: 120 };
  return new Map([[id, beats]]);
}

describe("playlistEnergy", () => {
  it("reads neutral energy and no lifts for an empty playlist", () => {
    const playlist: Playlist = { songs: [] };

    const energy = playlistEnergy(playlist, NO_SONG_LOUDNESS, NO_SONG_BEATS);

    expect(energy.energyAt(0)).toBe(NEUTRAL_ENERGY);
    expect(energy.meanEnergy(0, 1000)).toBe(NEUTRAL_ENERGY);
    expect(energy.liftsMs).toEqual([]);
  });

  it("reads a song's own energy curve inside its territory", () => {
    const a = song("a", 20_000);
    const playlist: Playlist = { songs: [a] };
    const loudness = loudnessOf([
      "a",
      [...levelMs(QUIET_LUFS, 10_000), ...levelMs(LOUD_LUFS, 10_000)],
    ]);

    const energy = playlistEnergy(playlist, loudness, NO_SONG_BEATS);

    expect(energy.energyAt(2000)).toBeLessThan(NEUTRAL_ENERGY);
    expect(energy.energyAt(18_000)).toBeGreaterThan(NEUTRAL_ENERGY);
  });

  it("reads neutral energy and no lifts for a song whose picture changes are even", () => {
    const a = song("a", 20_000, { pictureChanges: EVEN_PICTURE_CHANGES });
    const playlist: Playlist = { songs: [a] };
    const loudness = loudnessOf([
      "a",
      [...levelMs(QUIET_LUFS, 10_000), ...levelMs(LOUD_LUFS, 10_000)],
    ]);

    const energy = playlistEnergy(playlist, loudness, NO_SONG_BEATS);

    expect(energy.energyAt(18_000)).toBe(NEUTRAL_ENERGY);
    expect(energy.liftsMs).toEqual([]);
  });

  it("reads neutral energy for a song that was not measured yet", () => {
    const a = song("a", 20_000);
    const playlist: Playlist = { songs: [a] };

    const energy = playlistEnergy(playlist, NO_SONG_LOUDNESS, NO_SONG_BEATS);

    expect(energy.energyAt(18_000)).toBe(NEUTRAL_ENERGY);
    expect(energy.liftsMs).toEqual([]);
  });

  it("reads neutral energy for a song whose excerpt is silent throughout", () => {
    const a = song("a", 20_000);
    const playlist: Playlist = { songs: [a] };
    // Below the absolute gate throughout, so every sample floors at the same LUFS: flat.
    const loudness = loudnessOf(["a", levelMs(-80, 20_000)]);

    const energy = playlistEnergy(playlist, loudness, NO_SONG_BEATS);

    expect(energy.energyAt(10_000)).toBe(NEUTRAL_ENERGY);
    expect(energy.liftsMs).toEqual([]);
  });

  it("reads neutral energy and no lifts for a song that is flat, with only a fraction of an LU of swing", () => {
    const a = song("a", 20_000);
    const playlist: Playlist = { songs: [a] };
    // Under ENERGY_MIN_RANGE_LU (2): no audible dynamics, unlike the few-LU-swing case covered
    // by songEnergyRange's own tests.
    const loudness = loudnessOf(["a", [...levelMs(-20.5, 10_000), ...levelMs(-19.8, 10_000)]]);

    const energy = playlistEnergy(playlist, loudness, NO_SONG_BEATS);

    expect(energy.energyAt(18_000)).toBe(NEUTRAL_ENERGY);
    expect(energy.liftsMs).toEqual([]);
  });

  it("lets the incoming song win inside a crossfade's overlap", () => {
    const a = song("a", 20_000, { fadeOutMs: 4000 });
    const b = song("b", 20_000, { fadeInMs: 4000 });
    const playlist: Playlist = { songs: [a, b] };
    const loudness = loudnessOf(
      ["a", [...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 5000)]],
      ["b", levelMs(QUIET_LUFS, 20_000)],
    );

    const energy = playlistEnergy(playlist, loudness, NO_SONG_BEATS);

    // b starts at 16 000 (20 000 - 4 000 overlap); 16 500 sits in a's loud tail, but b's
    // uniformly quiet excerpt reads neutral there, proving b is consulted, not a.
    expect(energy.energyAt(16_500)).toBeCloseTo(NEUTRAL_ENERGY, 1);
  });

  it("averages energy over a span at every LOUDNESS_HOP_MS, quieter half below louder half", () => {
    const a = song("a", 20_000);
    const playlist: Playlist = { songs: [a] };
    const loudness = loudnessOf([
      "a",
      [...levelMs(QUIET_LUFS, 10_000), ...levelMs(LOUD_LUFS, 10_000)],
    ]);

    const energy = playlistEnergy(playlist, loudness, NO_SONG_BEATS);

    expect(energy.meanEnergy(0, 10_000)).toBeLessThan(energy.meanEnergy(10_000, 20_000));
  });

  it("collects lifts from every song, in playlist ms, ascending", () => {
    const a = song("a", 30_000);
    const b = song("b", 30_000);
    const playlist: Playlist = { songs: [a, b], betweenSongs: SEQUENCE_BETWEEN_SONGS };
    const loudness = loudnessOf(
      ["a", [...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)]],
      ["b", [...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)]],
    );

    const energy = playlistEnergy(playlist, loudness, NO_SONG_BEATS);

    expect(energy.liftsMs).toEqual([15_000, 45_000]);
  });

  it("snaps a song's lift to its own beats, offset into playlist ms", () => {
    const a = song("a", 10_000);
    const b = song("b", 30_000);
    const playlist: Playlist = { songs: [a, b], betweenSongs: SEQUENCE_BETWEEN_SONGS };
    const loudness = loudnessOf([
      "b",
      [...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)],
    ]);
    const beats = beatsOf("b", [14_700, 15_400]);

    const energy = playlistEnergy(playlist, loudness, beats);

    // a is 10 000 ms long, unmeasured; b starts at 10 000 and snaps its lift to 14 700.
    expect(energy.liftsMs).toEqual([10_000 + 14_700]);
  });

  it("leaves a lift where it is for a song without beats", () => {
    const a = song("a", 30_000);
    const playlist: Playlist = { songs: [a] };
    const loudness = loudnessOf([
      "a",
      [...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)],
    ]);

    const energy = playlistEnergy(playlist, loudness, NO_SONG_BEATS);

    expect(energy.liftsMs).toEqual([15_000]);
  });
});
