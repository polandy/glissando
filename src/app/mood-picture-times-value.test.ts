import { describe, expect, it } from "vitest";
import { createTranslator } from "./i18n/translator";
import { moodPictureTimesValueText } from "./mood-picture-times-value";

const en = createTranslator("en");

describe("moodPictureTimesValueText (MOOD.md)", () => {
  it("names the mood's seconds alone without a tempo", () => {
    expect(moodPictureTimesValueText(en, "calm", undefined)).toBe("~7 s");
  });

  it("names the seconds and the beats they span with a tempo", () => {
    // 60 BPM (1 beat/s), calm steps in 4-beat units: 7 s rounds to the nearest, 8 s = 8 beats.
    expect(moodPictureTimesValueText(en, "calm", 60)).toBe("~8 s · 8 beats");
  });

  it("proves the beat count tracks the tempo, not a fixed number", () => {
    // Lively steps in 2 beats; at 40 BPM one beat is 1.5 s, so 2 beats make 3 s – its own target.
    expect(moodPictureTimesValueText(en, "lively", 40)).toBe("~3 s · 2 beats");
  });
});
