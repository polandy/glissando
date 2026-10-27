import { describe, expect, it } from "vitest";
import { createTranslator } from "../../i18n/translator";
import { energyPictureTimesRangeValueText } from "./energy-pacing-text";
import type { MoodEnergyPacing } from "./mood-energy-pacing";
import { moodPictureTimesText } from "./mood-text";
import { moodTileSummaryText, type MoodTileInput } from "./mood-tile-summary";

const translator = createTranslator("en");
const { t } = translator;

function input(overrides: Partial<MoodTileInput> = {}): MoodTileInput {
  return {
    mood: undefined,
    ownDurationCount: 0,
    energyPacing: false,
    hasMusic: false,
    ...overrides,
  };
}

const VARYING_RANGE: MoodEnergyPacing = { minMs: 2000, maxMs: 6000, firstLiftUnitIndex: undefined };
const FLAT_RANGE: MoodEnergyPacing = { minMs: 4000, maxMs: 4000, firstLiftUnitIndex: undefined };
// Different ms, but both round to the same tenth of a second once formatted.
const ROUNDS_TO_FLAT_RANGE: MoodEnergyPacing = {
  minMs: 6710,
  maxMs: 6740,
  firstLiftUnitIndex: undefined,
};

describe("moodTileSummaryText", () => {
  it("names Custom's automatic picture times with the standard motion, without own durations", () => {
    expect(moodTileSummaryText(translator, input(), undefined, null)).toBe(
      `${t("slideshow.automatic")} · ${t("mood.motionStandard")}`,
    );
  });

  it("counts Custom's own durations", () => {
    expect(moodTileSummaryText(translator, input({ ownDurationCount: 2 }), undefined, null)).toBe(
      `${t("slideshow.automaticWithOwn", { count: 2 })} · ${t("mood.motionStandard")}`,
    );
  });

  it("names Calm's picture times with the gentle motion, with a tempo", () => {
    const picturesTimes = moodPictureTimesText(translator, "calm", 80);

    expect(moodTileSummaryText(translator, input({ mood: "calm" }), 80, null)).toBe(
      `${picturesTimes} · ${t("mood.motionGentle")}`,
    );
  });

  it("names Lively's picture times with the strong motion, without a tempo", () => {
    const picturesTimes = moodPictureTimesText(translator, "lively", undefined);

    expect(moodTileSummaryText(translator, input({ mood: "lively" }), undefined, null)).toBe(
      `${picturesTimes} · ${t("mood.motionStrong")}`,
    );
  });

  it("shows the found range, without '· by energy', once the energy pacing is on with music", () => {
    const range = energyPictureTimesRangeValueText(
      translator,
      VARYING_RANGE.minMs,
      VARYING_RANGE.maxMs,
    );

    expect(
      moodTileSummaryText(
        translator,
        input({ mood: "calm", energyPacing: true, hasMusic: true }),
        80,
        VARYING_RANGE,
      ),
    ).toBe(`${range} · ${t("mood.motionGentle")} · ${t("mood.followsTheEnergy")}`);
  });

  it("keeps the mood's own picture times once the energy pacing found no variance, with the suffix still on", () => {
    const picturesTimes = moodPictureTimesText(translator, "calm", 80);

    expect(
      moodTileSummaryText(
        translator,
        input({ mood: "calm", energyPacing: true, hasMusic: true }),
        80,
        FLAT_RANGE,
      ),
    ).toBe(`${picturesTimes} · ${t("mood.motionGentle")} · ${t("mood.followsTheEnergy")}`);
  });

  it("keeps the mood's own picture times once the range's two ends format the same, even though the ms differ", () => {
    const picturesTimes = moodPictureTimesText(translator, "calm", 80);

    expect(
      moodTileSummaryText(
        translator,
        input({ mood: "calm", energyPacing: true, hasMusic: true }),
        80,
        ROUNDS_TO_FLAT_RANGE,
      ),
    ).toBe(`${picturesTimes} · ${t("mood.motionGentle")} · ${t("mood.followsTheEnergy")}`);
  });

  it("does not show the range or the suffix with the energy pacing on but no music", () => {
    const picturesTimes = moodPictureTimesText(translator, "calm", 80);

    expect(
      moodTileSummaryText(
        translator,
        input({ mood: "calm", energyPacing: true, hasMusic: false }),
        80,
        VARYING_RANGE,
      ),
    ).toBe(`${picturesTimes} · ${t("mood.motionGentle")}`);
  });

  it("does not show the range or the suffix with music but the energy pacing off", () => {
    const picturesTimes = moodPictureTimesText(translator, "calm", 80);

    expect(
      moodTileSummaryText(
        translator,
        input({ mood: "calm", energyPacing: false, hasMusic: true }),
        80,
        VARYING_RANGE,
      ),
    ).toBe(`${picturesTimes} · ${t("mood.motionGentle")}`);
  });

  it("keeps Custom's own picture times, ignoring the found range, but still adds the suffix", () => {
    expect(
      moodTileSummaryText(
        translator,
        input({ energyPacing: true, hasMusic: true }),
        undefined,
        VARYING_RANGE,
      ),
    ).toBe(
      `${t("slideshow.automatic")} · ${t("mood.motionStandard")} · ${t("mood.followsTheEnergy")}`,
    );
  });
});
