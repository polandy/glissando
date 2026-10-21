import { describe, expect, it } from "vitest";
import {
  FOCUS_DISPLAY_STATUSES,
  NO_FOCUS_KNOWN,
  type FocusSlideshowSummary,
  type PicturesFocus,
} from "../../focus/pictures-focus";
import {
  FOCUS_STATUS_COLOR,
  FOCUS_STATUS_LABEL_KEY,
  focusSheetStatus,
  focusSheetTiles,
  tileDimmed,
  visibleFocusStatuses,
  type FocusSheetStatus,
} from "./focus-sheet-view";

function summary(partial: Partial<FocusSlideshowSummary>): FocusSlideshowSummary {
  return {
    counts: Object.fromEntries(FOCUS_DISPLAY_STATUSES.map((status) => [status, 0])) as Record<
      (typeof FOCUS_DISPLAY_STATUSES)[number],
      number
    >,
    done: 24,
    total: 24,
    again: false,
    failedCount: 0,
    ownMotionCount: 0,
    ...partial,
  };
}

describe("focusSheetStatus", () => {
  const cases: readonly [string, Partial<FocusSlideshowSummary>, boolean, FocusSheetStatus][] = [
    [
      "looking for the first time",
      { done: 9, total: 24, again: false },
      false,
      { kind: "looking", again: false, done: 9, total: 24 },
    ],
    [
      "looking again",
      { done: 10, total: 24, again: true },
      false,
      { kind: "looking", again: true, done: 10, total: 24 },
    ],
    [
      "paused on the server, pictures left",
      { done: 9, total: 24, again: true },
      true,
      { kind: "waitingForServer", done: 9, total: 24 },
    ],
    [
      "done, some failed",
      { done: 24, total: 24, failedCount: 3 },
      false,
      { kind: "failed", done: 24, total: 24, failedCount: 3 },
    ],
    [
      "done, nothing failed",
      { done: 24, total: 24, failedCount: 0 },
      false,
      { kind: "done", total: 24 },
    ],
  ];

  it.each(cases)("%s", (_name, partial, passPaused, expected) => {
    expect(focusSheetStatus(summary(partial), passPaused)).toEqual(expected);
  });
});

describe("tileDimmed", () => {
  it("dims nothing with no filter set", () => {
    expect(tileDimmed("face", false, null)).toBe(false);
    expect(tileDimmed("failed", true, null)).toBe(false);
  });

  it("filters by own motion, regardless of status", () => {
    expect(tileDimmed("face", true, "ownMotion")).toBe(false);
    expect(tileDimmed("face", false, "ownMotion")).toBe(true);
  });

  it("filters by status, regardless of own motion", () => {
    expect(tileDimmed("face", true, "face")).toBe(false);
    expect(tileDimmed("subject", true, "face")).toBe(true);
    expect(tileDimmed("subject", false, "face")).toBe(true);
  });
});

describe("visibleFocusStatuses", () => {
  it("keeps the canonical order, dropping statuses nothing has", () => {
    const counts = {
      ...Object.fromEntries(FOCUS_DISPLAY_STATUSES.map((status) => [status, 0])),
      face: 3,
      failed: 1,
    } as Record<(typeof FOCUS_DISPLAY_STATUSES)[number], number>;

    expect(visibleFocusStatuses(counts)).toEqual(["face", "failed"]);
  });

  it("is empty when every count is zero", () => {
    const counts = Object.fromEntries(
      FOCUS_DISPLAY_STATUSES.map((status) => [status, 0]),
    ) as Record<(typeof FOCUS_DISPLAY_STATUSES)[number], number>;

    expect(visibleFocusStatuses(counts)).toEqual([]);
  });
});

describe("FOCUS_STATUS_COLOR", () => {
  it("has a design token for every display status, none of them a raw colour", () => {
    for (const status of FOCUS_DISPLAY_STATUSES) {
      expect(FOCUS_STATUS_COLOR[status]).toMatch(/^var\(--gl-/);
    }
  });
});

describe("FOCUS_STATUS_LABEL_KEY", () => {
  it("has a catalogue key for every display status, each one its own", () => {
    const keys = FOCUS_DISPLAY_STATUSES.map((status) => FOCUS_STATUS_LABEL_KEY[status]);
    expect(new Set(keys).size).toBe(FOCUS_DISPLAY_STATUSES.length);
  });
});

describe("focusSheetTiles", () => {
  const pictures = [
    { id: "a", thumbnailUrl: "a.jpg", ownMotion: false },
    { id: "b", thumbnailUrl: "b.jpg", ownMotion: true },
  ];

  function focusWith(partial: Partial<PicturesFocus>): PicturesFocus {
    return { ...NO_FOCUS_KNOWN, ...partial };
  }

  it("pairs each picture with its status and own motion, none dimmed with no filter", () => {
    const focus = focusWith({ found: new Map([["a", { kind: "none" }]]) });

    expect(focusSheetTiles(focus, pictures, false, null)).toEqual([
      { id: "a", thumbnailUrl: "a.jpg", status: "none", ownMotion: false, dimmed: false },
      { id: "b", thumbnailUrl: "b.jpg", status: "waiting", ownMotion: true, dimmed: false },
    ]);
  });

  it("dims tiles the filter excludes", () => {
    const focus = focusWith({ found: new Map([["a", { kind: "none" }]]) });

    const tiles = focusSheetTiles(focus, pictures, false, "ownMotion");

    expect(tiles.map((tile) => tile.dimmed)).toEqual([true, false]);
  });
});
