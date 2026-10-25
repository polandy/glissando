import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { reactiveProps } from "../../testing/reactive-props.svelte";
import type { SlideshowDetails } from "../view-models";
import { details, previewPorts } from "./mood-sheet-browser-harness";
import InfoPanelRows from "./InfoPanelRows.svelte";
import MoodSheet from "./MoodSheet.svelte";

/** The info panel's "Follow the music's energy" row (ADR-0046), under "Picture times". */

const text = (within: Element | null): string =>
  within?.textContent?.replace(/\s+/g, " ").trim() ?? "";

const energySwitch = (within: HTMLElement): HTMLInputElement | null =>
  within.querySelector<HTMLInputElement>('[role="switch"]');

const pictureTimesRow = (within: HTMLElement): HTMLElement => {
  const row = Array.from(within.querySelectorAll<HTMLElement>(".rows > div")).find(
    (div) => text(div.querySelector("dt")) === "Picture times",
  );
  if (row === undefined) throw new Error("no Picture times row");
  return row;
};

const destroyers: (() => void)[] = [];
afterEach(() => {
  for (const destroy of destroyers.splice(0)) {
    destroy();
  }
});

function setUp(slideshow: SlideshowDetails) {
  const onEnergyPacing = vi.fn((on: boolean) => {
    props.slideshow = { ...props.slideshow, energyPacing: on };
  });
  const props = reactiveProps({
    slideshow,
    onEditMusic: vi.fn(),
    onEditTransitions: vi.fn(),
    onEditLook: vi.fn(),
    moodBpm: undefined as number | undefined,
    moodEnergyPacing: null,
    onEditMood: vi.fn(),
    onEnergyPacing,
    onEditPortraitPictures: vi.fn(),
    onEditChapters: vi.fn(),
  });
  const mounted = mountWithTranslator(InfoPanelRows, props, { current: createTranslator("en") });
  destroyers.push(mounted.destroy);
  return { target: mounted.target, onEnergyPacing };
}

describe("InfoPanelRows energy pacing row", () => {
  it("is hidden while the slideshow has no music", () => {
    const { target } = setUp(details({ songCount: 0 }));

    expect(energySwitch(target)).toBeNull();
  });

  it("is shown once the slideshow has music", () => {
    const { target } = setUp(details({ songCount: 1 }));

    expect(energySwitch(target)).not.toBeNull();
    expect(energySwitch(target)?.getAttribute("aria-label")).toBe("Follow the music's energy");
  });

  it("stores the switch at once, like the Mood sheet's, without Picture times changing height", () => {
    const { target, onEnergyPacing } = setUp(details({ songCount: 1, energyPacing: false }));

    expect(energySwitch(target)?.checked).toBe(false);
    const heightOffPx = pictureTimesRow(target).getBoundingClientRect().height;
    expect(heightOffPx).toBeGreaterThan(0);

    energySwitch(target)?.click();
    flushSync();

    expect(onEnergyPacing).toHaveBeenCalledWith(true);
    expect(energySwitch(target)?.checked).toBe(true);
    // The switch row right below says it is on; Picture times keeps its height so nothing jumps.
    expect(pictureTimesRow(target).getBoundingClientRect().height).toBe(heightOffPx);
  });

  it("keeps the info panel's switch and the Mood sheet's switch showing the same stored state", () => {
    const slideshow = details({ songCount: 1, energyPacing: false });
    function sync(on: boolean): void {
      infoProps.slideshow = { ...infoProps.slideshow, energyPacing: on };
      moodProps.slideshow = { ...moodProps.slideshow, energyPacing: on };
    }
    const infoProps = reactiveProps({
      slideshow,
      onEditMusic: vi.fn(),
      onEditTransitions: vi.fn(),
      onEditLook: vi.fn(),
      moodBpm: undefined as number | undefined,
      moodEnergyPacing: null,
      onEditMood: vi.fn(),
      onEnergyPacing: sync,
      onEditPortraitPictures: vi.fn(),
      onEditChapters: vi.fn(),
    });
    const moodProps = reactiveProps({
      slideshow,
      previewPorts: previewPorts(),
      moodBpm: undefined as number | undefined,
      moodPending: false,
      onMood: vi.fn(),
      onResetMood: vi.fn(),
      onEnergyPacing: sync,
      onClose: vi.fn(),
    });
    const info = mountWithTranslator(InfoPanelRows, infoProps, { current: createTranslator("en") });
    const mood = mountWithTranslator(MoodSheet, moodProps, { current: createTranslator("en") });
    destroyers.push(info.destroy, mood.destroy);

    expect(energySwitch(info.target)?.checked).toBe(false);
    expect(energySwitch(mood.target)?.checked).toBe(false);

    energySwitch(info.target)?.click();
    flushSync();

    expect(energySwitch(info.target)?.checked).toBe(true);
    expect(energySwitch(mood.target)?.checked).toBe(true);

    energySwitch(mood.target)?.click();
    flushSync();

    expect(energySwitch(info.target)?.checked).toBe(false);
    expect(energySwitch(mood.target)?.checked).toBe(false);
  });
});
