/** Shared set-up of the music editor's browser tests. */
import { flushSync } from "svelte";
import type { MusicTrim } from "../../library/own-music";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import type { ListenKind, ListenState } from "./listen-preview";
import MusicEditorScreen from "./MusicEditorScreen.svelte";

export const TRACK_MS = 204_000;

/** A slideshow of `count` pictures with a 3:24 track; `durations` gives pictures their own. */
export function slideshowWith(
  music: Partial<StoredMusic> = {},
  { count = 24, durations = {} as Readonly<Record<number, number>> } = {},
): StoredSlideshow {
  const pictures: StoredPicture[] = Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `p${index}.jpg`,
    ...(durations[index] === undefined ? {} : { durationMs: durations[index] }),
  }));
  return {
    id: "show",
    title: "Sommer am See",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    music: {
      id: "m1",
      fileName: "Sommerwind.mp3",
      durationMs: TRACK_MS,
      mimeType: "audio/mpeg",
      ...music,
    },
  };
}

let destroy: (() => void) | null = null;

export function unmountEditor(): void {
  destroy?.();
  destroy = null;
}

/** Mounts the editor on `slideshow`; its props can be changed afterwards, as the route does. */
export function mountEditor(slideshow: StoredSlideshow = slideshowWith()) {
  const calls = {
    trims: [] as (MusicTrim | undefined)[],
    fadesIn: [] as (number | undefined)[],
    fadesOut: [] as (number | undefined)[],
    listens: [] as ListenKind[],
    stops: 0,
  };
  const props = reactiveProps({
    slideshow,
    peaks: Float32Array.from({ length: 1000 }, (_, index) => (index % 10) / 10),
    listening: null as ListenState | null,
    onBack: () => {},
    onTrim: (trim: MusicTrim | undefined) => calls.trims.push(trim),
    onFadeIn: (fadeMs: number | undefined) => calls.fadesIn.push(fadeMs),
    onFadeOut: (fadeMs: number | undefined) => calls.fadesOut.push(fadeMs),
    onListen: (kind: ListenKind) => calls.listens.push(kind),
    onStopListening: () => (calls.stops += 1),
    saving: false,
  });
  const mounted = mountWithTranslator(MusicEditorScreen, props);
  destroy = mounted.destroy;
  const set = (changes: Partial<typeof props>) => {
    Object.assign(props, changes);
    flushSync();
  };
  return { target: mounted.target, calls, set };
}

export function handle(edge: "Anfang" | "Ende"): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(`[role="slider"][aria-label="${edge}"]`);
  if (found === null) {
    throw new Error(`no handle "${edge}"`);
  }
  return found;
}

export function text(selector: string): string {
  return document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/** The client x of track time `atMs` on the waveform. */
export function xOf(atMs: number): number {
  const wave = document.querySelector(".wave");
  if (wave === null) {
    throw new Error("no waveform");
  }
  const rect = wave.getBoundingClientRect();
  return rect.left + (atMs / TRACK_MS) * rect.width;
}

/** Drags from track time `fromMs` on `on` to `toMs`, releasing there. */
export function drag(on: Element, fromMs: number, toMs: number): void {
  const at = (ms: number) => ({ clientX: xOf(ms), clientY: 0, pointerId: 1, bubbles: true });
  on.dispatchEvent(new PointerEvent("pointerdown", at(fromMs)));
  window.dispatchEvent(new PointerEvent("pointermove", at(toMs)));
  flushSync();
  window.dispatchEvent(new PointerEvent("pointerup", at(toMs)));
  flushSync();
}
