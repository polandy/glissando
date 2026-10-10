/** Shared set-up of the `SlideshowScreen` browser tests. */
import { flushSync } from "svelte";
import type { SlideshowTransition } from "../../library/own-timing";
import { FakeClock, FakeFrameScheduler } from "../../player/testing/fakes";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import SlideshowScreen from "./SlideshowScreen.svelte";
import type { ExportMenuState } from "../glissando-file/export-menu";
import type { SlideshowDetails, SlideshowStorage, StorageAction } from "./view-models";
import { createTranslator } from "../i18n/translator";

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
    musicSeconds: null,
    musicSummary: null,
    ownOrder: false,
    ownMotionCount: 0,
    ownDurationCount: 0,
    ownTransitionCount: 0,
    transition: "crossfade",
    captionCount: 0,
    capturedFrom: "2025-07-01T10:00:00Z",
    capturedTo: "2025-07-03T10:00:00Z",
    pictures: ids.map((id, index) => ({
      id,
      thumbnailUrl: PIXEL,
      capturedAt: `2025-07-0${index + 1}T10:00:00Z`,
      ownMotion: false,
      ownDurationMs: null,
      ownTransition: null,
    })),
  };
  return { ...base, ...overrides };
}

export function mountScreen(
  slideshow: SlideshowDetails = details(["a", "b", "c"]),
  {
    mousePointer = true,
    saving = false,
    reducedMotion = false,
    newPictureIds = new Set<string>(),
    storage = null as SlideshowStorage | null,
    english = false,
  } = {},
) {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const calls = {
    removed: [] as string[],
    shifted: [] as [string, number][],
    moved: [] as [string, number][],
    renamed: [] as string[],
    edited: [] as string[],
    musicEdits: 0,
    transitions: [] as SlideshowTransition[],
    transitionResets: 0,
    deletes: 0,
    adds: 0,
    storageActions: [] as StorageAction[],
  };
  // The transitions sheet's picks and resets come back as the parent would show them.
  const props = reactiveProps({
    slideshow,
    onBack: () => {},
    onPlay: () => {},
    onAddPictures: () => (calls.adds += 1),
    newPictureIds,
    onRemove: (pictureId: string) => calls.removed.push(pictureId),
    onShift: (pictureId: string, offset: number) => calls.shifted.push([pictureId, offset]),
    onMove: (pictureId: string, insertion: number) => calls.moved.push([pictureId, insertion]),
    onRename: (typed: string) => calls.renamed.push(typed),
    onEdit: (pictureId: string) => calls.edited.push(pictureId),
    onEditMusic: () => (calls.musicEdits += 1),
    onTransition: (transition: SlideshowTransition) => {
      calls.transitions.push(transition);
      props.slideshow = { ...props.slideshow, transition };
    },
    onResetTransition: () => {
      calls.transitionResets += 1;
      props.slideshow = { ...props.slideshow, transition: "crossfade" };
    },
    previewPorts: { clock, frames },
    reducedMotion,
    onDelete: () => (calls.deletes += 1),
    exportState: { kind: "idle", sizeBytes: null } as ExportMenuState,
    onExport: () => {},
    onMenuOpened: () => {},
    newVideoExport: () => {
      throw new Error("the video export sheet is not opened in these tests");
    },
    newHtmlExport: () => {
      throw new Error("the web page export sheet is not opened in these tests");
    },
    mousePointer,
    saving,
    storage,
    onStorageAction: (action: StorageAction) => calls.storageActions.push(action),
  });
  const mounted = mountWithTranslator(
    SlideshowScreen,
    props,
    english ? { current: createTranslator("en") } : undefined,
  );
  destroy = mounted.destroy;
  return { target: mounted.target, calls, clock, frames };
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
