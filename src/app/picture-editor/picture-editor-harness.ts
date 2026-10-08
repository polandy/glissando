/** Shared set-up of the `PictureEditorScreen` browser tests. */
import { flushSync } from "svelte";
import type { OwnKenBurns } from "../../library/own-ken-burns";
import { FakeClock, FakeFrameScheduler } from "../../player/testing/fakes";
import { mountWithTranslator } from "../testing/mount-with-translator";
import PictureEditorScreen from "./PictureEditorScreen.svelte";
import type { PictureEditorView } from "./picture-editor-view";

// A transparent pixel stands in for the picture.
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export const AUTOMATIC: OwnKenBurns = {
  from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  to: { zoom: 1.2, centerX: 0.55, centerY: 0.5 },
};

export function view(overrides: Partial<PictureEditorView> = {}): PictureEditorView {
  return {
    id: "b",
    number: 2,
    count: 3,
    fileName: "b.jpg",
    capturedAt: "2025-07-02T10:00:00Z",
    size: { width: 400, height: 300 },
    motion: AUTOMATIC,
    ownMotion: false,
    durationMs: 5000,
    previousId: "a",
    nextId: "c",
    ...overrides,
  };
}

let destroy = () => {};

export function unmountEditor(): void {
  destroy();
}

export function mountEditor(shown: PictureEditorView = view(), { reducedMotion = false } = {}) {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const calls = {
    changed: [] as OwnKenBurns[],
    opened: [] as string[],
    swaps: 0,
    resets: 0,
    backs: 0,
  };
  const mounted = mountWithTranslator(PictureEditorScreen, {
    picture: shown,
    pictureUrl: PIXEL,
    slideshowTitle: "Sommer am See",
    onBack: () => (calls.backs += 1),
    onOpen: (pictureId: string) => calls.opened.push(pictureId),
    onChange: (motion: OwnKenBurns) => calls.changed.push(motion),
    onSwap: () => (calls.swaps += 1),
    onReset: () => (calls.resets += 1),
    previewPorts: { clock, frames },
    reducedMotion,
    saving: false,
  });
  destroy = mounted.destroy;
  /** Moves the preview's clock on and lets it draw the next frame. */
  const advance = (ms: number) => {
    clock.advance(ms);
    frames.runFrame();
    flushSync();
  };
  return { target: mounted.target, calls, frames, advance };
}

export function element<T extends Element = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (found === null) {
    throw new Error(`nothing matches ${selector}`);
  }
  return found;
}

export function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (candidate) =>
      candidate.textContent?.trim().startsWith(name) ||
      candidate.getAttribute("aria-label") === name,
  );
  if (found === undefined) {
    throw new Error(`no button named "${name}"`);
  }
  return found;
}

export function press(target: HTMLElement, key: string, shiftKey = false): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }));
  flushSync();
}
