/** Shared set-up of the `SlideshowScreen` browser tests. */
import { flushSync } from "svelte";
import { mountWithTranslator } from "../testing/mount-with-translator";
import SlideshowScreen from "./SlideshowScreen.svelte";
import type { SlideshowDetails } from "./view-models";

let destroy = () => {};

/** Unmounts the screen the last `mountScreen` mounted. */
export function unmountScreen(): void {
  destroy();
}

// A transparent pixel stands in for every thumbnail.
export const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function details(ids: readonly string[], overrides: Partial<SlideshowDetails> = {}) {
  const base: SlideshowDetails = {
    title: "Sommer am See",
    coverUrl: PIXEL,
    durationSeconds: 60,
    musicTitle: null,
    ownOrder: false,
    ownMotionCount: 0,
    capturedFrom: "2025-07-01T10:00:00Z",
    capturedTo: "2025-07-03T10:00:00Z",
    pictures: ids.map((id, index) => ({
      id,
      thumbnailUrl: PIXEL,
      capturedAt: `2025-07-0${index + 1}T10:00:00Z`,
      ownMotion: false,
    })),
  };
  return { ...base, ...overrides };
}

export function mountScreen(
  slideshow: SlideshowDetails = details(["a", "b", "c"]),
  { mousePointer = true, saving = false } = {},
) {
  const calls = {
    removed: [] as string[],
    moved: [] as [string, number][],
    renamed: [] as string[],
    edited: [] as string[],
    deletes: 0,
  };
  const mounted = mountWithTranslator(SlideshowScreen, {
    slideshow,
    onBack: () => {},
    onPlay: () => {},
    onRemove: (pictureId: string) => calls.removed.push(pictureId),
    onMove: (pictureId: string, toIndex: number) => calls.moved.push([pictureId, toIndex]),
    onRename: (typed: string) => calls.renamed.push(typed),
    onEdit: (pictureId: string) => calls.edited.push(pictureId),
    onDelete: () => (calls.deletes += 1),
    exportState: { kind: "idle", sizeBytes: null },
    onExport: () => {},
    onMenuOpened: () => {},
    mousePointer,
    saving,
  });
  destroy = mounted.destroy;
  return { target: mounted.target, calls };
}

export function byLabel<T extends HTMLElement = HTMLButtonElement>(label: string): T {
  const found = document.querySelector<T>(`[aria-label="${label}"]`);
  if (found === null) {
    throw new Error(`nothing labelled "${label}"`);
  }
  return found;
}

export function buttonNamed(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === name,
  );
  if (found === undefined) {
    throw new Error(`no button named "${name}"`);
  }
  return found;
}

/** A tile's button, named by its picture's description. */
export function tile(number: number, date: string): HTMLButtonElement {
  const picture = document.querySelector(`img[alt="Bild ${number}, aufgenommen am ${date}"]`);
  const button = picture?.closest("button");
  if (button === null || button === undefined) {
    throw new Error(`no tile for picture ${number}`);
  }
  return button;
}
export const selectionBar = () => document.querySelector('[role="toolbar"]');

export function press(target: HTMLElement, key: string, shiftKey = false): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }));
  flushSync();
}
