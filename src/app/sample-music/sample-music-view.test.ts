import { describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { SAMPLE_TRACKS } from "../../sample-music/sample-tracks";
import {
  SAMPLE_TRACK_MOOD_KEYS,
  sampleCardDisabled,
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
