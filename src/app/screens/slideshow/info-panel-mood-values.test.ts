import { describe, expect, it } from "vitest";
import { createTranslator } from "../../i18n/translator";
import type { SlideshowDetails } from "../view-models";
import { infoPanelMoodValues } from "./info-panel-mood-values";

// A generated 1×1 pixel: no real picture is used in this test (CLAUDE.md).
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function details(overrides: Partial<SlideshowDetails> = {}): SlideshowDetails {
  return {
    title: "Sommer am See",
    coverUrl: PIXEL,
    durationSeconds: 60,
    songCount: 0,
    musicTitle: null,
    musicSeconds: null,
    musicSummary: null,
    ownOrder: false,
    automaticChaptersOff: false,
    chapters: [],
    ownMotionCount: 0,
    ownDurationCount: 0,
    ownTransitionCount: 0,
    transition: "crossfade",
    look: "none",
    portraitPictures: "automatic",
    pairCount: 0,
    captionCount: 0,
    capturedFrom: "2025-07-01T10:00:00Z",
    capturedTo: "2025-07-03T10:00:00Z",
    pictures: [],
    ...overrides,
  };
}

describe("the info panel's mood-conditional values", () => {
  const translator = createTranslator("en");

  it("shows the slideshow's own transition without a mood", () => {
    const values = infoPanelMoodValues(
      translator,
      details({ transition: "crossfade" }),
      undefined,
      "own summary",
    );
    expect(values.transitionValue).toBe(translator.t("effect.crossfade"));
    expect(values.transitionRowSummary).toBe("own summary");
  });

  it("names a picture without its own duration as automatic, without a mood", () => {
    const values = infoPanelMoodValues(translator, details({ ownDurationCount: 0 }), undefined, "");
    expect(values.pictureTimesValue).toBe(translator.t("slideshow.automatic"));
  });

  it("counts pictures with their own duration, without a mood", () => {
    const values = infoPanelMoodValues(translator, details({ ownDurationCount: 2 }), undefined, "");
    expect(values.pictureTimesValue).toBe(translator.t("slideshow.automaticWithOwn", { count: 2 }));
  });

  it("paces the transition, picture times and Ken Burns to the mood once one is set", () => {
    const values = infoPanelMoodValues(translator, details({ mood: "calm" }), 80, "own summary");
    expect(values.transitionRowSummary).toBe(translator.t("mood.byMood"));
    expect(values.transitionValue).not.toBe("");
    expect(values.pictureTimesValue).not.toBe(translator.t("slideshow.automatic"));
    expect(values.kenBurnsValue).not.toBe(translator.t("slideshow.automatic"));
  });
});
