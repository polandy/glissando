import { flushSync } from "svelte";
import { afterEach } from "vitest";
import type { PictureImportState } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import ImportPicturesStrip from "../import/ImportPicturesStrip.svelte";
import { SessionArrangement } from "../import/session-arrangement";
import { mountWithTranslator } from "./mount-with-translator";

const picture = (id: string): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  fileName: `${id}.jpg`,
  width: 100,
  height: 100,
  colours: { veil: "#404040", accent: "#C0C0C0" },
});

/** A fake `PictureImport` store sliver, just enough for `SessionArrangement` to reconcile against. */
function fakePictures(ids: readonly string[]) {
  const state = {
    total: 0,
    done: 0,
    pictures: ids.map(picture),
    picks: [],
    skipped: [],
    storageFull: false,
    busy: false,
    failed: false,
  } satisfies PictureImportState;
  return {
    state,
    subscribe: (listener: (state: PictureImportState) => void) => {
      listener(state);
      return () => undefined;
    },
  };
}

/** A real arrangement over `ids`, capture order until moved or shuffled. */
export function arrangementWith(ids: readonly string[], randomValues: readonly number[] = []) {
  const values = [...randomValues];
  return new SessionArrangement({
    pictures: fakePictures(ids),
    exempt: () => undefined,
    random: () => values.shift() ?? 0,
  });
}

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

export function mountStrip(options: {
  readonly ids: readonly string[];
  readonly withoutUrl?: readonly string[];
  readonly pending?: number;
  readonly busy?: boolean;
  readonly arrangement?: SessionArrangement | null;
  readonly onAddMore?: { onPickFiles: () => void; onPickFolder: () => void } | null;
  readonly onOpenImmich?: (() => void) | null;
}) {
  const {
    ids,
    withoutUrl = [],
    pending = 0,
    busy = false,
    arrangement = null,
    onAddMore = { onPickFiles: () => {}, onPickFolder: () => {} },
    onOpenImmich = null,
  } = options;
  const pictures = ids.map(picture);
  const urls = new Map(ids.filter((id) => !withoutUrl.includes(id)).map((id) => [id, "data:,"]));
  const removed: string[] = [];
  const viewed: string[] = [];
  const mounted = mountWithTranslator(ImportPicturesStrip, {
    pictures,
    urls,
    pending,
    busy,
    arrangement,
    onAddMore,
    onOpenImmich,
    onRemove: (pictureId: string) => removed.push(pictureId),
    onView: (pictureId: string) => viewed.push(pictureId),
  });
  unmounts.push(mounted.destroy);
  return { target: mounted.target, removed, viewed };
}

/** A button's accessible name where it has one (Earlier and Later are icons), else its words. */
export const nameOf = (button: Element): string =>
  button.getAttribute("aria-label") ?? text(button);
export const text = (element: Element | null | undefined): string =>
  (element?.textContent ?? "").replace(/\s+/g, " ").trim();
export const tiles = (target: HTMLElement) => [
  ...target.querySelectorAll<HTMLButtonElement>(".strip button.pick"),
];
export const press = (key: string) => {
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  flushSync();
};
