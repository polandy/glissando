import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { SAMPLE_TRACKS } from "../../sample-music/sample-tracks";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { Toaster } from "../toast/toaster";
import SampleMusicGrid from "./SampleMusicGrid.svelte";
import { previewWith } from "./testing/sample-preview-fixtures";

/** The grid's width in the Add song sheet on a 390 px phone: three cards of about 85 px. */
const ADD_SONG_SHEET_WIDTH_PX = 280;
/** The grid's width in the import music step on the 412 px reference phone. */
const IMPORT_STEP_WIDTH_PX = 350;

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

/** Mounts the unfolded grid in German, whose moods are the longest, at `widthPx`. */
async function mountGerman(widthPx: number): Promise<HTMLElement> {
  const mounted = mountWithTranslator(
    SampleMusicGrid,
    {
      preview: previewWith().preview,
      isAdded: () => false,
      onToggle: () => undefined,
      toaster: new Toaster(new FakeScheduler()),
      initiallyExpanded: true,
    },
    { current: createTranslator("de") },
  );
  unmounts.push(mounted.destroy);
  mounted.target.style.width = `${widthPx}px`;
  // hasTrackOnDevice resolves on a microtask per track; a flush after lets its effect settle.
  await Promise.resolve();
  await Promise.resolve();
  flushSync();
  return mounted.target;
}

const cards = (target: HTMLElement): HTMLElement[] => [
  ...target.querySelectorAll<HTMLElement>(".card"),
];

function part(card: HTMLElement, selector: string): HTMLElement {
  const element = card.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`card has no ${selector}`);
  return element;
}

/** Firefox rounds a wrapped text box's scroll size up by a pixel; a cut line is ~15 px. */
const SUBPIXEL_ROUNDING_PX = 1;

/** Whether `element` shows all of its text: nothing clipped, clamped or cut with an ellipsis. */
const showsInFull = (element: HTMLElement): boolean =>
  element.scrollWidth <= element.clientWidth + SUBPIXEL_ROUNDING_PX &&
  element.scrollHeight <= element.clientHeight + SUBPIXEL_ROUNDING_PX;

function overlaps(a: Element, b: Element): boolean {
  const boxA = a.getBoundingClientRect();
  const boxB = b.getBoundingClientRect();
  return (
    boxA.left < boxB.right &&
    boxB.left < boxA.right &&
    boxA.top < boxB.bottom &&
    boxB.top < boxA.bottom
  );
}

describe.each([
  ["the Add song sheet", ADD_SONG_SHEET_WIDTH_PX],
  ["the import music step", IMPORT_STEP_WIDTH_PX],
])("SampleMusicGrid in German, at the width of %s", (_where, widthPx) => {
  it("shows every card's title and mood in full", async () => {
    const target = await mountGerman(widthPx);

    expect(cards(target)).toHaveLength(SAMPLE_TRACKS.length);
    const cut = cards(target).flatMap((card) =>
      [part(card, ".title"), part(card, ".mood")]
        .filter((text) => text.textContent.trim() !== "" && !showsInFull(text))
        .map((text) => text.textContent.trim()),
    );
    expect(cut).toEqual([]);
  });

  it("keeps play and + off every card's title and mood", async () => {
    const target = await mountGerman(widthPx);

    expect(cards(target)).toHaveLength(SAMPLE_TRACKS.length);
    const crowded = cards(target).flatMap((card) => {
      const controls = [part(card, ".play"), part(card, ".plus")];
      const texts = [part(card, ".title"), part(card, ".mood")];
      return controls.some((control) => texts.some((text) => overlaps(control, text)))
        ? [part(card, ".title").textContent.trim()]
        : [];
    });
    expect(crowded).toEqual([]);
  });
});
