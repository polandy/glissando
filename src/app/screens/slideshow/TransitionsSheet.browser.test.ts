import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeClock, FakeFrameScheduler } from "../../../player/testing/fakes";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { reactiveProps } from "../../testing/reactive-props.svelte";
import type { PictureTile, SlideshowDetails } from "../view-models";
import TransitionsSheet from "./TransitionsSheet.svelte";

// A generated 1×1 pixel: no real picture is used in this test (CLAUDE.md).
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function picture(id: string, overrides: Partial<PictureTile> = {}): PictureTile {
  return {
    id,
    thumbnailUrl: PIXEL,
    capturedAt: "2025-07-01T10:00:00Z",
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber: null,
    blurredFill: false,
    alone: false,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    ...overrides,
  };
}

function details(
  ids: readonly string[],
  overrides: Partial<SlideshowDetails> = {},
): SlideshowDetails {
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
    energyPacing: false,
    look: "none",
    portraitPictures: "automatic",
    pairCount: 0,
    captionCount: 0,
    capturedFrom: "2025-07-01T10:00:00Z",
    capturedTo: "2025-07-03T10:00:00Z",
    pictures: ids.map((id, index) =>
      picture(id, { capturedAt: `2025-07-0${index + 1}T10:00:00Z` }),
    ),
    ...overrides,
  };
}

const text = (within: Element | null) => within?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const dialog = () => document.querySelector("dialog");
function tile(choice: string): HTMLButtonElement {
  const found = dialog()?.querySelector<HTMLButtonElement>(
    `[role="radio"][data-choice="${choice}"]`,
  );
  if (found === null || found === undefined) {
    throw new Error(`no tile for ${choice}`);
  }
  return found;
}
const hint = () => text(dialog()?.querySelector(".hint") ?? null);

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

// Picking a transition leaves the mood (ADR-0045); `mood` is only ever absent, never explicitly
// undefined, since `exactOptionalPropertyTypes` tells the two apart.
function withoutMood(
  slideshow: SlideshowDetails,
  transition: SlideshowDetails["transition"],
): SlideshowDetails {
  const left: { -readonly [Key in keyof SlideshowDetails]: SlideshowDetails[Key] } = {
    ...slideshow,
    transition,
  };
  delete left.mood;
  return left;
}

function setUp(slideshow: SlideshowDetails) {
  const onTransition = vi.fn((transition: SlideshowDetails["transition"]) => {
    props.slideshow = withoutMood(props.slideshow, transition);
  });
  const onReset = vi.fn();
  const onClose = vi.fn();
  const props = reactiveProps({
    slideshow,
    ports: { clock: new FakeClock(), frames: new FakeFrameScheduler() },
    reducedMotion: true,
    onTransition,
    onReset,
    onClose,
  });
  const mounted = mountWithTranslator(TransitionsSheet, props, { current: createTranslator("en") });
  destroy = mounted.destroy;
  return { target: mounted.target, onTransition, onReset, onClose };
}

describe("TransitionsSheet", () => {
  it("checks the stored transition and shows its own hint while Custom", () => {
    setUp(details(["a", "b"], { transition: "cut" }));

    expect(tile("cut").getAttribute("aria-checked")).toBe("true");
    expect(tile("alternate").getAttribute("aria-checked")).toBe("false");
    expect(hint()).toBe("The pictures follow one another without a transition.");
  });

  it("checks the mood's transition, not the stored field, under a mood", () => {
    // Lively sets "alternate" (mood-settings.ts); the slideshow's own field still reads "cut"
    // from before the mood was chosen, and must not be shown as checked.
    setUp(details(["a", "b"], { transition: "cut", mood: "lively" }));

    expect(tile("alternate").getAttribute("aria-checked")).toBe("true");
    expect(tile("cut").getAttribute("aria-checked")).toBe("false");
    expect(hint()).toBe("Set by the mood Lively. Choosing another switches the mood to Custom.");
  });

  it("checks calm's crossfade under that mood, with the mood's own hint", () => {
    setUp(details(["a", "b"], { transition: "cut", mood: "calm" }));

    expect(tile("crossfade").getAttribute("aria-checked")).toBe("true");
    expect(hint()).toBe("Set by the mood Calm. Choosing another switches the mood to Custom.");
  });

  it("picking another tile under a mood still calls onTransition, to leave the mood", () => {
    const { onTransition } = setUp(details(["a", "b"], { transition: "cut", mood: "lively" }));

    tile("crossfade").click();
    flushSync();

    expect(onTransition).toHaveBeenCalledWith("crossfade");
    expect(tile("crossfade").getAttribute("aria-checked")).toBe("true");
  });
});
