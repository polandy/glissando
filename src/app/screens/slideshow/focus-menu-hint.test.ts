import { describe, expect, it } from "vitest";
import type { FocusSlideshowSummary } from "../../focus/pictures-focus";
import { focusMenuHint, type FocusMenuHint } from "./focus-menu-hint";

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

describe("focusMenuHint", () => {
  const cases: readonly [string, Partial<FocusSlideshowSummary>, FocusMenuHint][] = [
    [
      "still looking for the first time",
      { done: 5, total: 24, again: false },
      { kind: "looking", again: false, done: 5, total: 24 },
    ],
    [
      "looking again",
      { done: 10, total: 24, again: true },
      { kind: "looking", again: true, done: 10, total: 24 },
    ],
    ["done, nothing failed", { done: 24, total: 24, failedCount: 0 }, { kind: "done" }],
    ["done, some failed", { done: 24, total: 24, failedCount: 3 }, { kind: "failed", count: 3 }],
    [
      "pending work wins over a leftover failed count",
      { done: 5, total: 24, failedCount: 2 },
      { kind: "looking", again: false, done: 5, total: 24 },
    ],
  ];

  it.each(cases)("%s", (_name, partial, expected) => {
    expect(focusMenuHint(summary(partial))).toEqual(expected);
  });
});
