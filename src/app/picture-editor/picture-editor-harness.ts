/** Shared set-up of the `PictureEditorScreen` browser tests. */
import { flushSync } from "svelte";
import { transitionDurationMs } from "../../compose";
import type { OwnKenBurns } from "../../library/own-ken-burns";
import { CUT_TRANSITION, type TransitionChoice } from "../../library/own-timing";
import { FakeClock, FakeFrameScheduler } from "../../player/testing/fakes";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
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
    focus: { kind: "not-looked-at" },
    durationMs: 5000,
    ownDuration: false,
    durationBasis: { kind: "seconds-per-picture", automaticMs: 5000 },
    transition: {
      choice: "crossfade",
      own: false,
      automatic: "crossfade",
      slideshowTransition: "crossfade",
      durationMs: 1000,
    },
    caption: "",
    previousId: "a",
    nextId: "c",
    next: { size: { width: 300, height: 400 }, motion: AUTOMATIC, durationMs: 5000, caption: "" },
    ...overrides,
  };
}

let destroy = () => {};

export function unmountEditor(): void {
  destroy();
}

/** The view after `choice` is picked (`own: true`) or an own transition is reset to it. */
function transitionedView(
  current: PictureEditorView,
  choice: TransitionChoice,
  own: boolean,
): PictureEditorView {
  const plays = current.next !== null && choice !== CUT_TRANSITION;
  return {
    ...current,
    transition: {
      ...current.transition,
      choice,
      own,
      durationMs: plays ? transitionDurationMs(current.durationMs) : 0,
    },
  };
}

export function mountEditor(shown: PictureEditorView = view(), { reducedMotion = false } = {}) {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  let current = shown;
  const calls = {
    changed: [] as OwnKenBurns[],
    opened: [] as string[],
    swaps: 0,
    resets: 0,
    backs: 0,
    captions: [] as string[],
    durations: [] as number[],
    durationResets: 0,
    transitions: [] as TransitionChoice[],
    transitionResets: 0,
  };
  /** Shows the picture as stored after an edit, e.g. with its new duration. */
  const update = (changed: PictureEditorView): void => {
    current = changed;
    props.picture = changed;
    flushSync();
  };
  const props = reactiveProps({
    picture: shown,
    pictureUrl: PIXEL,
    nextPictureUrl: PIXEL,
    slideshowTitle: "Sommer am See",
    onBack: () => (calls.backs += 1),
    onOpen: (pictureId: string) => calls.opened.push(pictureId),
    onChange: (motion: OwnKenBurns) => calls.changed.push(motion),
    onSwap: () => (calls.swaps += 1),
    onReset: () => (calls.resets += 1),
    onCaption: (typed: string) => calls.captions.push(typed),
    onDuration: (durationMs: number) => calls.durations.push(durationMs),
    onResetDuration: () => (calls.durationResets += 1),
    // A picked (or reset) transition is stored at once, as the real app's store does.
    onTransition: (choice: TransitionChoice) => {
      calls.transitions.push(choice);
      update(transitionedView(current, choice, true));
    },
    onResetTransition: () => {
      calls.transitionResets += 1;
      update(transitionedView(current, current.transition.automatic, false));
    },
    previewPorts: { clock, frames },
    reducedMotion,
    saving: false,
  });
  const mounted = mountWithTranslator(PictureEditorScreen, props);
  destroy = mounted.destroy;
  /** Moves the preview's clock on and lets it draw the next frame. */
  const advance = (ms: number) => {
    clock.advance(ms);
    frames.runFrame();
    flushSync();
  };
  return { target: mounted.target, calls, frames, advance, update };
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
