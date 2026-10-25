import { vi } from "vitest";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { reactiveProps } from "../../testing/reactive-props.svelte";
import type { SlideshowDetails } from "../view-models";
import type { MoodPreviewPorts } from "./mood-preview-ports";
import { moodPreviewPortsFixture } from "./mood-preview-ports-fixture";
import MoodSheet from "./MoodSheet.svelte";

/** Shared mounting and DOM queries for `MoodSheet.browser.test.ts` and its energy-pacing sibling. */

// A generated 1×1 pixel: no real picture is used in this test (CLAUDE.md).
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function details(overrides: Partial<SlideshowDetails> = {}): SlideshowDetails {
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
    pictures: [],
    ...overrides,
  };
}

export const previewPorts = moodPreviewPortsFixture;

export const dialogEl = (): HTMLDialogElement | null => document.querySelector("dialog");
export const text = (within: Element | null): string =>
  within?.textContent?.replace(/\s+/g, " ").trim() ?? "";

export function tile(choice: string): HTMLButtonElement {
  const found = dialogEl()?.querySelector<HTMLButtonElement>(
    `[role="radio"][data-choice="${choice}"]`,
  );
  if (found === null || found === undefined) {
    throw new Error(`no tile for ${choice}`);
  }
  return found;
}

export const hint = (): string => text(dialogEl()?.querySelector(".hint") ?? null);

export const setText = (dt: string): string => {
  const row = Array.from(dialogEl()?.querySelectorAll(".sets > div") ?? []).find(
    (div) => text(div.querySelector("dt")) === dt,
  );
  return text(row?.querySelector("dd") ?? null);
};

export const energySwitch = (): HTMLInputElement | null =>
  dialogEl()?.querySelector<HTMLInputElement>('[role="switch"]') ?? null;

let destroy: (() => void) | null = null;

/** Unmounts the sheet the last `setUp` mounted; call from each test file's own `afterEach`. */
export function cleanupMoodSheet(): void {
  destroy?.();
  destroy = null;
}

export function setUp(
  slideshow: SlideshowDetails,
  ports: MoodPreviewPorts = previewPorts(),
  moodBpm: number | undefined = undefined,
  moodPending = false,
) {
  const onMood = vi.fn();
  const onResetMood = vi.fn();
  const onEnergyPacing = vi.fn();
  const onClose = vi.fn();
  const props = reactiveProps({
    slideshow,
    previewPorts: ports,
    moodBpm,
    moodPending,
    onMood,
    onResetMood,
    onEnergyPacing,
    onClose,
  });
  const mounted = mountWithTranslator(MoodSheet, props, { current: createTranslator("en") });
  destroy = mounted.destroy;
  return { target: mounted.target, onMood, onResetMood, onEnergyPacing, onClose };
}
