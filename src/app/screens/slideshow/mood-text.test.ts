import { describe, expect, it } from "vitest";
import { createTranslator } from "../../i18n/translator";
import { moodKenBurnsText, moodName, moodPictureTimesText, moodTransitionText } from "./mood-text";

const en = createTranslator("en");

describe("moodName", () => {
  it("names Custom and every mood", () => {
    expect(moodName(en.t, undefined)).toBe("No mood");
    expect(moodName(en.t, "calm")).toBe("Calm");
    expect(moodName(en.t, "lively")).toBe("Lively");
  });
});

describe("moodPictureTimesText", () => {
  it("falls back to the slideshow's own automatic text while Custom", () => {
    expect(moodPictureTimesText(en, undefined, 120)).toBe("automatic");
  });

  it("names the mood's seconds alone without a tempo", () => {
    expect(moodPictureTimesText(en, "calm", undefined)).toBe("~7 s");
  });

  it("names the seconds and the beats they span with a tempo", () => {
    // 60 BPM (1 beat/s), calm steps in 4-beat units: 7 s rounds to the nearest, 8 s = 8 beats.
    expect(moodPictureTimesText(en, "calm", 60)).toBe("~8 s · 8 beats");
  });

  it("proves the beat count tracks the tempo, not a fixed number", () => {
    // Lively steps in 2 beats; at 40 BPM one beat is 1.5 s, so 2 beats make 3 s – its own target.
    expect(moodPictureTimesText(en, "lively", 40)).toBe("~3 s · 2 beats");
  });
});

describe("moodKenBurnsText", () => {
  it("is automatic while Custom, and the mood's strength otherwise", () => {
    expect(moodKenBurnsText(en.t, undefined)).toBe("automatic");
    expect(moodKenBurnsText(en.t, "calm")).toBe("Gentle");
    expect(moodKenBurnsText(en.t, "lively")).toBe("Strong");
  });
});

describe("moodTransitionText", () => {
  it("is standard, with no mood to name, while Custom", () => {
    expect(moodTransitionText(en.t, undefined)).toBe("automatic");
  });

  it("names calm's crossfade as long, lively's mix as short", () => {
    expect(moodTransitionText(en.t, "calm")).toBe("Crossfade, long");
    expect(moodTransitionText(en.t, "lively")).toBe("Mixed, short");
  });
});
