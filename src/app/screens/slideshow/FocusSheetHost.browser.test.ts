import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PicturesFocus } from "../../focus/pictures-focus";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import FocusSheetHostHost from "./testing/FocusSheetHostHost.svelte";

// A generated 1×1 pixel: no real picture is used in this test (CLAUDE.md).
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function openSheet() {
  const onClosed = vi.fn();
  const mounted = mountWithTranslator(FocusSheetHostHost, {
    focus: {
      found: new Map(),
      searching: new Set<string>(),
      failed: new Set<string>(),
      outdated: new Set<string>(),
    } satisfies PicturesFocus,
    pictures: [{ id: "a", thumbnailUrl: PIXEL, ownMotion: false }],
    search: undefined,
    passPaused: false,
    onServer: false,
    onEdit: () => {},
    onLookAgain: () => {},
    onClosed,
  });
  destroy = mounted.destroy;
  const more = mounted.target.querySelector<HTMLButtonElement>('button[aria-label="Mehr"]');
  more?.click();
  flushSync();
  return { target: mounted.target, more, onClosed };
}

describe("FocusSheetHost", () => {
  it("gives focus back to the button it opened from when the sheet closes", () => {
    const { target, more, onClosed } = openSheet();
    const close = target.querySelector<HTMLButtonElement>('button[aria-label="Schließen"]');
    expect(close).not.toBeNull();

    close?.click();
    flushSync();

    expect(onClosed).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(more);
  });
});
