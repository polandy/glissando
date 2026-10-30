import { describe, expect, it } from "vitest";
import { levelMs, syntheticLoudness } from "../../../compose/energy/testing/synthetic-loudness";
import { NO_SONG_BEATS } from "../../../compose/playlist";
import type { StoredPicture, StoredSlideshow } from "../../../library/stored-slideshow";
import { createTranslator } from "../../i18n/translator";
import { moodSheetEnergyView } from "./mood-sheet-energy-view";

const translator = createTranslator("en");
const QUIET_LUFS = -30;
const LOUD_LUFS = -12;

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 400,
    height: 300,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

function picturesNumbered(count: number): StoredPicture[] {
  return Array.from({ length: count }, (_unused, index) => picture(`p${index}`));
}

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: picturesNumbered(6),
    songs: [{ id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" }],
    secondsPerPicture: 5,
    ...overrides,
  };
}

const quietThenLoud = new Map([
  ["m", syntheticLoudness([...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)])],
]);

describe("moodSheetEnergyView", () => {
  it("falls back to the usual rows and hint while the switch is off", () => {
    const stored = storedSlideshow();

    const view = moodSheetEnergyView(translator, stored, undefined, undefined, {
      beats: NO_SONG_BEATS,
      loudness: quietThenLoud,
    });

    expect(view).toEqual({
      pictureTimesText: translator.t("slideshow.automatic"),
      hasLift: false,
      hintText: translator.t("mood.hintCustom"),
      stripGeometry: null,
    });
  });

  it("falls back to the usual rows while the switch is on but nothing has loaded yet", () => {
    const stored = storedSlideshow({ energyPacing: true });

    const view = moodSheetEnergyView(translator, stored, undefined, undefined, null);

    expect(view.pictureTimesText).toBe(translator.t("slideshow.automatic"));
    expect(view.stripGeometry).toBeNull();
  });

  it("shows the energy range and a lift row once the switch is on and durations vary", () => {
    const stored = storedSlideshow({ energyPacing: true });

    const view = moodSheetEnergyView(translator, stored, undefined, undefined, {
      beats: NO_SONG_BEATS,
      loudness: quietThenLoud,
    });

    expect(view.pictureTimesText).toMatch(/· by energy$/);
    expect(view.hasLift).toBe(true);
    expect(view.stripGeometry?.areaPoints.length).toBeGreaterThan(0);
  });

  it("names the energy hint under a mood, a different one under Custom", () => {
    const stored = storedSlideshow({ energyPacing: true });
    const analysis = { beats: NO_SONG_BEATS, loudness: quietThenLoud };

    const underMood = moodSheetEnergyView(translator, stored, "calm", undefined, analysis);
    const underCustom = moodSheetEnergyView(translator, stored, undefined, undefined, analysis);

    expect(underMood.hintText).toBe(translator.t("mood.hintMoodEnergy"));
    expect(underCustom.hintText).toBe(translator.t("mood.hintCustomEnergy"));
  });

  it("gives no lift row while the switch is on but none was found", () => {
    const stored = storedSlideshow({ energyPacing: true });
    const quietThroughout = new Map([["m", syntheticLoudness(levelMs(QUIET_LUFS, 30_000))]]);

    const view = moodSheetEnergyView(translator, stored, undefined, undefined, {
      beats: NO_SONG_BEATS,
      loudness: quietThroughout,
    });

    expect(view.hasLift).toBe(false);
  });
});
