import { describe, expect, it } from "vitest";
import { createTranslator } from "../../i18n/translator";
import { musicTileValue, type MusicTileInput } from "./music-tile-summary";

const { t, formatDuration } = createTranslator("en");

function input(overrides: Partial<MusicTileInput> = {}): MusicTileInput {
  return {
    songCount: 0,
    musicTitle: null,
    musicSeconds: null,
    durationSeconds: 60,
    ...overrides,
  };
}

describe("musicTileValue", () => {
  it("names 'None' and 'Add music' without music", () => {
    const value = musicTileValue(t, formatDuration, input());

    expect(value.value).toBe(t("slideshow.noMusic"));
    expect(value.summary).toBe(t("slideshow.addMusic"));
  });

  it("names the song by its file name, without a summary when its length matches the slideshow", () => {
    const value = musicTileValue(
      t,
      formatDuration,
      input({ songCount: 1, musicTitle: "Sommer.mp3", musicSeconds: 60, durationSeconds: 60 }),
    );

    expect(value.value).toBe("Sommer.mp3");
    expect(value.summary).toBe("");
  });

  it("adds the music's length once it differs from the slideshow's", () => {
    const value = musicTileValue(
      t,
      formatDuration,
      input({ songCount: 1, musicTitle: "Sommer.mp3", musicSeconds: 680, durationSeconds: 60 }),
    );

    expect(value.summary).toBe(t("slideshow.musicLength", { duration: formatDuration(680) }));
  });

  it("counts several songs, with the playlist's length as the summary", () => {
    const value = musicTileValue(
      t,
      formatDuration,
      input({ songCount: 3, musicTitle: "Sommer.mp3", musicSeconds: 680, durationSeconds: 60 }),
    );

    expect(value.value).toBe(t("slideshow.songCount", { count: 3 }));
    expect(value.summary).toBe(t("slideshow.musicLength", { duration: formatDuration(680) }));
  });

  it("drops the summary once two differently-rounded lengths format the same", () => {
    const value = musicTileValue(
      t,
      formatDuration,
      input({ songCount: 1, musicTitle: "Sommer.mp3", musicSeconds: 60.4, durationSeconds: 60 }),
    );

    expect(value.summary).toBe("");
  });
});
