import { describe, expect, it } from "vitest";
import { NO_SELECTION, soleSelection, type StripSelection } from "./strip-selection";
import { selectionBarView, type SelectionBarOptions } from "./selection-bar-view";

const ORDER = ["a", "b", "c", "d"];
const ALL: SelectionBarOptions = { arranging: true, canInsertChapter: true, canMoveGroup: true };

function several(...ids: string[]): StripSelection {
  return { ids: new Set(ids), several: true, startedBySelect: true, anchor: ids.at(-1) ?? null };
}

describe("selectionBarView", () => {
  const cases: {
    name: string;
    selection: StripSelection;
    order?: readonly string[];
    options?: Partial<SelectionBarOptions>;
    expected: Record<string, unknown>;
  }[] = [
    {
      name: "nothing selected",
      selection: NO_SELECTION,
      expected: {
        count: 0,
        soleId: null,
        soleIndex: -1,
        single: true,
        range: null,
        earlierDisabled: true,
        laterDisabled: true,
        removeLabel: { key: "slideshow.removePictures", count: 1 },
        removeDisabledLook: false,
        showChapter: true,
        showMoveTo: false,
      },
    },
    {
      name: "sole picture in the middle",
      selection: soleSelection("b"),
      expected: {
        count: 1,
        soleId: "b",
        soleIndex: 1,
        range: { from: 2, to: 2 },
        earlierDisabled: false,
        laterDisabled: false,
        showMoveTo: true,
      },
    },
    {
      name: "sole first picture cannot go earlier",
      selection: soleSelection("a"),
      expected: { earlierDisabled: true, laterDisabled: false },
    },
    {
      name: "sole last picture cannot go later",
      selection: soleSelection("d"),
      expected: { earlierDisabled: false, laterDisabled: true },
    },
    {
      name: "the only picture looks undeletable",
      selection: soleSelection("a"),
      order: ["a"],
      expected: { removeDisabledLook: true, earlierDisabled: true, laterDisabled: true },
    },
    {
      name: "several mode with nothing picked",
      selection: several(),
      expected: {
        count: 0,
        single: false,
        range: null,
        removeLabel: { key: "slideshow.removeNoPictures" },
        removeDisabledLook: true,
        showChapter: false,
        showMoveTo: false,
      },
    },
    {
      name: "several mode with one picked",
      selection: several("c"),
      expected: {
        single: true,
        removeLabel: { key: "slideshow.removePictures", count: 1 },
        showChapter: true,
      },
    },
    {
      name: "contiguous block, listed in play order",
      selection: several("c", "b"),
      expected: {
        selectedIds: ["b", "c"],
        count: 2,
        soleId: "b",
        range: { from: 2, to: 3 },
        single: false,
        removeLabel: { key: "slideshow.removePictures", count: 2 },
        removeDisabledLook: false,
        showChapter: false,
      },
    },
    {
      name: "split selection has no range",
      selection: several("a", "c"),
      expected: { range: null, count: 2 },
    },
    {
      name: "block at the start cannot go earlier",
      selection: several("a", "b"),
      expected: { earlierDisabled: true, laterDisabled: false },
    },
    {
      name: "everything selected cannot move either way",
      selection: several(...ORDER),
      expected: { earlierDisabled: true, laterDisabled: true, range: { from: 1, to: 4 } },
    },
    {
      name: "adding hides Move to",
      selection: soleSelection("b"),
      options: { arranging: false },
      expected: { showMoveTo: false },
    },
    {
      name: "no move handler hides Move to",
      selection: soleSelection("b"),
      options: { canMoveGroup: false },
      expected: { showMoveTo: false },
    },
    {
      name: "no chapter handler hides the chapter action",
      selection: soleSelection("b"),
      options: { canInsertChapter: false },
      expected: { showChapter: false },
    },
  ];

  it.each(cases)("$name", ({ selection, order, options, expected }) => {
    expect(selectionBarView(selection, order ?? ORDER, { ...ALL, ...options })).toMatchObject(
      expected,
    );
  });
});
