import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, beforeEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import type { PictureImportState } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import { mountWithTranslator } from "../testing/mount-with-translator";
import ImportPicturesStrip from "./ImportPicturesStrip.svelte";
import { SessionArrangement } from "./session-arrangement";

/** The narrowest phone the bar is held to, in CSS pixels. */
const NARROW = { width: 360, height: 740 };
const DESKTOP = { width: 1280, height: 900 };

const picture = (id: string): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  fileName: `${id}.jpg`,
  width: 100,
  height: 100,
  colours: { veil: "#404040", accent: "#C0C0C0" },
});

/** A real arrangement over `ids` (Earlier and Later in the bar), fed by a static store sliver. */
function arrangementWith(ids: readonly string[]) {
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
  return new SessionArrangement({
    pictures: {
      state,
      subscribe: (listener: (state: PictureImportState) => void) => {
        listener(state);
        return () => undefined;
      },
    },
    exempt: () => undefined,
    random: () => 0,
  });
}

let destroy = (): void => undefined;
beforeEach(async () => {
  await page.viewport(NARROW.width, NARROW.height);
});
afterEach(async () => {
  destroy();
  document.querySelector(".screen")?.remove();
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

it("on a phone the adding bar keeps its actions and Done in one row inside the bar", () => {
  const ids = ["a", "b", "c"];
  const mounted = mountWithTranslator(ImportPicturesStrip, {
    pictures: ids.map(picture),
    urls: new Map(ids.map((id) => [id, "data:,"])),
    pending: 0,
    busy: false,
    arrangement: arrangementWith(ids),
    onAddMore: { onPickFiles: () => {}, onPickFolder: () => {} },
    onOpenImmich: null,
    onRemove: () => {},
    onView: () => {},
  });
  destroy = mounted.destroy;
  // The query container the app's screens provide (base.css).
  const screen = document.createElement("div");
  screen.className = "screen";
  document.body.append(screen);
  screen.append(mounted.target);

  mounted.target.querySelectorAll<HTMLButtonElement>(".strip button.pick")[1]?.click();
  flushSync();

  const bar = mounted.target.querySelector<HTMLElement>('[role="toolbar"]');
  expect(bar).not.toBeNull();
  const barBox = bar?.getBoundingClientRect();
  const buttons = [...(bar?.querySelectorAll("button") ?? [])];
  expect(buttons.length).toBe(5);
  // Icon buttons and word buttons differ in height; one row shares their vertical centre.
  const centre = (box: DOMRect) => Math.round(box.top + box.height / 2);
  const centres = new Set(buttons.map((button) => centre(button.getBoundingClientRect())));
  expect(centres.size).toBe(1);
  for (const button of buttons) {
    expect(button.getBoundingClientRect().bottom).toBeLessThanOrEqual(barBox?.bottom ?? 0);
  }
});
