import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import Toast from "../components/Toast.svelte";
import { mountWithTranslator } from "../testing/mount-with-translator";
import type { StoredPicture } from "../../library/stored-slideshow";
import ChosenPicturesStrip from "./ChosenPicturesStrip.svelte";
import ImportFrame from "./ImportFrame.svelte";

/** Taller than any test viewport, so the sticky action bar rests on the viewport's bottom. */
const TALL_BODY = createRawSnippet(() => ({ render: () => `<div style="height: 4000px"></div>` }));
const NEXT_BUTTON = createRawSnippet(() => ({
  render: () => `<button class="btn primary" type="button">Weiter</button>`,
}));

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) {
    unmount();
  }
  unmounts = [];
});

function mountFrame(): HTMLElement {
  const frame = mountWithTranslator(ImportFrame, {
    step: "pictures",
    onBack: () => undefined,
    children: TALL_BODY,
    actions: NEXT_BUTTON,
  });
  unmounts.push(frame.destroy);
  return frame.target;
}

function mountToast(): HTMLElement {
  const toast = mountWithTranslator(Toast, {
    toast: { text: "Diashow erstellt", tone: "info" },
    onAction: () => undefined,
    onDismiss: () => undefined,
  });
  unmounts.push(toast.destroy);
  const element = toast.target.querySelector<HTMLElement>(".toast");
  if (element === null) {
    throw new Error("the toast rendered no .toast element");
  }
  return element;
}

/** A scroller shorter than the page, so the sticky bar rests on its bottom edge. */
const SCROLLER_HEIGHT = "500px";

const MANY_PICTURES: readonly StoredPicture[] = Array.from({ length: 80 }, (_, index) => ({
  id: `picture-${index}`,
  capturedAt: "2025-07-01T10:00:00Z",
  width: 400,
  height: 300,
  fileName: `picture-${index}.jpg`,
}));

function mountStripInto(frame: HTMLElement): void {
  const strip = mountWithTranslator(ChosenPicturesStrip, {
    pictures: MANY_PICTURES,
    urls: new Map(),
    pending: 0,
    onRemove: () => undefined,
    onEmptied: () => undefined,
  });
  unmounts.push(strip.destroy);
  frame.querySelector(".content")?.prepend(strip.target);
}

describe("ImportFrame", () => {
  it.each([".remove", ".date"])(
    "paints the bottom actions over a tile's %s mark scrolled under it",
    (selector) => {
      const frame = mountFrame();
      frame.style.cssText = `height: ${SCROLLER_HEIGHT}; overflow: auto`;
      mountStripInto(frame);
      const bar = frame.querySelector<HTMLElement>(".actions")?.getBoundingClientRect();
      const mark = frame.querySelectorAll<HTMLElement>(`.strip ${selector}`)[20];
      mark?.scrollIntoView({ block: "end", behavior: "instant" });
      const box = mark?.getBoundingClientRect();
      const centerX = (box?.left ?? 0) + (box?.width ?? 0) / 2;
      const centerY = (box?.top ?? 0) + (box?.height ?? 0) / 2;

      expect(centerY).toBeGreaterThan(bar?.top ?? Infinity);
      expect(
        frame.querySelector(".actions")?.contains(document.elementFromPoint(centerX, centerY)),
      ).toBe(true);
    },
  );

  it("keeps a toast clear above the wizard's bottom actions", () => {
    const frame = mountFrame();
    const actions = frame.querySelector(".actions");
    const toast = mountToast();

    expect(actions).not.toBeNull();
    expect(toast.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      actions?.getBoundingClientRect().top ?? 0,
    );
  });

  it("lets the toast return to the bottom once the wizard is gone", () => {
    const toast = mountToast();
    const restingBottom = toast.getBoundingClientRect().bottom;
    const unmountFrame = (mountFrame(), unmounts[unmounts.length - 1]);
    expect(toast.getBoundingClientRect().bottom).toBeLessThan(restingBottom);

    unmountFrame?.();

    expect(toast.getBoundingClientRect().bottom).toBe(restingBottom);
  });
});
