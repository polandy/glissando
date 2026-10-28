import { describe, expect, it } from "vitest";
import type { FocusSlideshowSummary } from "../../focus/pictures-focus";
import { focusMenuFailedCount } from "./focus-menu-hint";

function summary(partial: Partial<FocusSlideshowSummary>): FocusSlideshowSummary {
  return {
    counts: {} as FocusSlideshowSummary["counts"],
    done: 24,
    total: 24,
    again: false,
    failedCount: 0,
    ownMotionCount: 0,
    ...partial,
  };
}

describe("focusMenuFailedCount", () => {
  const cases: readonly [string, Partial<FocusSlideshowSummary>, number][] = [
    ["done, some failed: their count", { done: 24, total: 24, failedCount: 3 }, 3],
    ["done, nothing failed: none", { done: 24, total: 24, failedCount: 0 }, 0],
    ["still looking: none, the progress is not the menu's", { done: 5, total: 24 }, 0],
    ["looking again: none", { done: 10, total: 24, again: true }, 0],
    ["pending work hides a leftover failed count", { done: 5, total: 24, failedCount: 2 }, 0],
  ];

  it.each(cases)("%s", (_name, partial, expected) => {
    expect(focusMenuFailedCount(summary(partial))).toBe(expected);
  });
});
