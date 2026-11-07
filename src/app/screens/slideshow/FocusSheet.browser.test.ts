import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { PicturesFocus } from "../../focus/pictures-focus";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { reactiveProps } from "../../testing/reactive-props.svelte";
import FocusSheet from "./FocusSheet.svelte";

// A generated 1×1 pixel: no real picture is used in this test (CLAUDE.md).
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const PICTURES = [
  { id: "a", thumbnailUrl: PIXEL, ownMotion: true },
  { id: "b", thumbnailUrl: PIXEL, ownMotion: false },
  { id: "c", thumbnailUrl: PIXEL, ownMotion: false },
] as const;

/** "a" has its chosen motion and a found face; "b" failed; "c" found scenery (ADR-0041). */
const FOCUS: PicturesFocus = {
  found: new Map([
    ["a", { kind: "subject", box: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 }, foundBy: "face" }],
    ["c", { kind: "scenery" }],
  ]),
  searching: new Set(),
  failed: new Set(["b"]),
  outdated: new Set(),
};

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function setUp(focus: PicturesFocus) {
  const lookAgains: (readonly string[])[] = [];
  const props = reactiveProps({
    focus,
    pictures: PICTURES,
    search: undefined,
    passPaused: false,
    onServer: false,
    onEdit: () => {},
    onLookAgain: (ids: readonly string[]) => lookAgains.push(ids),
    onClose: () => {},
  });
  const mounted = mountWithTranslator(FocusSheet, props);
  destroy = mounted.destroy;
  return { target: mounted.target, props, lookAgains };
}

function tileTitles(target: HTMLElement): (string | null)[] {
  return [...target.querySelectorAll(".grid .tile")].map((tile) => tile.getAttribute("title"));
}

function ownBadgeCount(target: HTMLElement): number {
  return target.querySelectorAll(".grid .tile .own").length;
}

describe("FocusSheet", () => {
  it("shows each picture's status and marks only the chosen-motion one, offering to try the failure again", () => {
    const { target, lookAgains } = setUp(FOCUS);

    expect(tileTitles(target)).toEqual(["Gesichter", "Fehlgeschlagen", "Landschaft"]);
    expect(ownBadgeCount(target)).toBe(1);

    const tryAgain = [...target.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Die 1 erneut versuchen"),
    );
    tryAgain?.click();

    expect(lookAgains).toEqual([["b"]]);
  });

  it("looking again at the failed picture updates only it, leaving the others and the chosen-motion badge as they were", () => {
    const { target, props } = setUp(FOCUS);

    // The parent moved "b" from failed to searching; "a" and "c" keep their earlier result.
    props.focus = {
      found: FOCUS.found,
      searching: new Set(["b"]),
      failed: new Set(),
      outdated: new Set(),
    };
    flushSync();

    expect(tileTitles(target)).toEqual(["Gesichter", "Wird gesucht", "Landschaft"]);
    expect(ownBadgeCount(target)).toBe(1);
    // No failure is left, so the sheet no longer offers to try one again.
    expect(
      [...target.querySelectorAll("button")].some((button) =>
        button.textContent?.includes("erneut versuchen"),
      ),
    ).toBe(false);
  });

  it("'look again at all' asks for every picture, including the one with its chosen motion", () => {
    const { target, lookAgains } = setUp(FOCUS);

    const lookAgainAll = [...target.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Alle 3 Bilder erneut ansehen"),
    );
    lookAgainAll?.click();

    expect(lookAgains).toEqual([["a", "b", "c"]]);
  });
});
