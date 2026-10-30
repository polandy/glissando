import { describe, expect, it } from "vitest";
import { createTranslator } from "../../i18n/translator";
import { moodTransitionValue } from "./mood-transition-value";

describe("moodTransitionValue", () => {
  const { t } = createTranslator("en");

  it("shows the slideshow's own transition and summary without a mood", () => {
    const value = moodTransitionValue(t, { transition: "crossfade" }, "own summary");

    expect(value.transitionValue).toBe(t("effect.crossfade"));
    expect(value.transitionRowSummary).toBe("own summary");
  });

  it("paces the transition to the mood once one is set, with 'by mood' as the summary", () => {
    const value = moodTransitionValue(t, { mood: "calm", transition: "crossfade" }, "own summary");

    expect(value.transitionRowSummary).toBe(t("mood.byMood"));
    expect(value.transitionValue).not.toBe(t("effect.crossfade"));
  });
});
