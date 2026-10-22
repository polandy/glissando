import { describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { SAMPLE_TRACKS } from "../../sample-music/sample-tracks";
import type { SampleSongRow } from "./sample-song-pick";
import {
  SAMPLE_TRACK_MOOD_KEYS,
  sampleCardDisabled,
  sampleCardDownloadProgress,
  sampleCardStatusKey,
} from "./sample-music-view";

describe("SAMPLE_TRACK_MOOD_KEYS", () => {
  it("has a mood for every track, translatable in German and English", () => {
    const de = createTranslator("de");
    const en = createTranslator("en");
    for (const track of SAMPLE_TRACKS) {
      const key = SAMPLE_TRACK_MOOD_KEYS[track.id];
      expect(de.t(key)).not.toBe(key);
      expect(en.t(key)).not.toBe(key);
      expect(de.t(key)).not.toBe(en.t(key));
    }
  });

  it("gives every track its own key", () => {
    const keys = SAMPLE_TRACKS.map((track) => SAMPLE_TRACK_MOOD_KEYS[track.id]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("sampleCardStatusKey", () => {
  it("is undefined online with nothing stored yet", () => {
    expect(sampleCardStatusKey(true, false)).toBeUndefined();
  });

  it("reads On this device once the track is stored, online or not", () => {
    expect(sampleCardStatusKey(true, true)).toBe("sampleMusicPicker.onDevice");
    expect(sampleCardStatusKey(false, true)).toBe("sampleMusicPicker.onDevice");
  });

  it("reads Needs a connection offline with nothing stored", () => {
    expect(sampleCardStatusKey(false, false)).toBe("sampleMusicPicker.needsConnection");
  });
});

describe("sampleCardDisabled", () => {
  it("is disabled only offline and not on this device", () => {
    expect(sampleCardDisabled(false, false)).toBe(true);
    expect(sampleCardDisabled(false, true)).toBe(false);
    expect(sampleCardDisabled(true, false)).toBe(false);
    expect(sampleCardDisabled(true, true)).toBe(false);
  });
});

describe("sampleCardDownloadProgress", () => {
  it("is undefined without a downloading row for the track", () => {
    expect(sampleCardDownloadProgress([], "hold-the-frame")).toBeUndefined();
  });

  it("is undefined for a failed row: no ring once a download has given up", () => {
    const rows: readonly SampleSongRow[] = [
      { kind: "failedSampleDownload", trackId: "hold-the-frame", title: "Hold the Frame" },
    ];
    expect(sampleCardDownloadProgress(rows, "hold-the-frame")).toBeUndefined();
  });

  it("is the row's fraction while it downloads", () => {
    const rows: readonly SampleSongRow[] = [
      {
        kind: "downloadingSample",
        trackId: "hold-the-frame",
        title: "Hold the Frame",
        progress: 0.42,
      },
    ];
    expect(sampleCardDownloadProgress(rows, "hold-the-frame")).toBe(0.42);
    expect(sampleCardDownloadProgress(rows, "morning-latitude")).toBeUndefined();
  });
});
