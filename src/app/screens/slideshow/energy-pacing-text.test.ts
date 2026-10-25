import { describe, expect, it } from "vitest";
import { createTranslator } from "../../i18n/translator";
import { energyPictureTimesRangeText } from "./energy-pacing-text";

const translator = createTranslator("en");

describe("energyPictureTimesRangeText", () => {
  it("names the shortest and the longest automatic duration, to the tenth second", () => {
    expect(energyPictureTimesRangeText(translator, 5000, 10_000)).toBe("5 s – 10 s · by energy");
  });

  it("drops a trailing .0 from either end, keeping a real tenth", () => {
    expect(energyPictureTimesRangeText(translator, 4500, 10_000)).toBe("4.5 s – 10 s · by energy");
  });
});
