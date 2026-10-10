import { describe, expect, it } from "vitest";
import {
  endSelecting,
  hold,
  NO_SELECTION,
  pick,
  selectedInOrder,
  soleSelection,
  startSelecting,
  withoutRemoved,
  type StripSelection,
} from "./strip-selection";

const ORDER = ["a", "b", "c", "d", "e"];
const plain = (selection: StripSelection, id: string) =>
  pick(selection, id, ORDER, { toggleKey: false, rangeKey: false });
const ctrl = (selection: StripSelection, id: string) =>
  pick(selection, id, ORDER, { toggleKey: true, rangeKey: false });
const shift = (selection: StripSelection, id: string) =>
  pick(selection, id, ORDER, { toggleKey: false, rangeKey: true });

describe("pick, outside selecting several", () => {
  it("selects only the picked tile", () => {
    const selected = plain(NO_SELECTION, "b");
    expect(selected.ids).toEqual(new Set(["b"]));
    expect(selected.several).toBe(false);
  });

  it("deselects a sole selection picked again", () => {
    const selected = plain(NO_SELECTION, "b");
    expect(plain(selected, "b").ids.size).toBe(0);
  });

  it("switches a single selection to the newly picked tile", () => {
    const selected = plain(NO_SELECTION, "b");
    expect(plain(selected, "c").ids).toEqual(new Set(["c"]));
  });

  it("enters several with Ctrl/⌘+click, keeping a single selection in it", () => {
    const selected = plain(NO_SELECTION, "b");
    const entered = ctrl(selected, "d");
    expect(entered.several).toBe(true);
    expect(entered.ids).toEqual(new Set(["b", "d"]));
  });

  it("enters several with Shift+click, adding the range from the last picked tile", () => {
    const selected = plain(NO_SELECTION, "b");
    const entered = shift(selected, "d");
    expect(entered.several).toBe(true);
    expect(entered.ids).toEqual(new Set(["b", "c", "d"]));
  });
});

describe("pick, while selecting several", () => {
  it("toggles membership on a plain pick", () => {
    const several = ctrl(NO_SELECTION, "b");
    const added = plain(several, "d");
    expect(added.ids).toEqual(new Set(["b", "d"]));
    expect(plain(added, "b").ids).toEqual(new Set(["d"]));
  });

  it("adds the range from the last (non-range) picked tile on Shift+click", () => {
    const anchored = plain(startSelecting(NO_SELECTION), "b");
    const ranged = shift(anchored, "d");
    expect(ranged.ids).toEqual(new Set(["b", "c", "d"]));
  });

  it("adds a further range pick from the same last (non-range) picked tile, not moving it", () => {
    const anchored = plain(startSelecting(NO_SELECTION), "b");
    const first = shift(anchored, "d");
    const second = shift(first, "a");
    expect(second.ids).toEqual(new Set(["a", "b", "c", "d"]));
  });

  it("ends several when the last tile is deselected, unless started with Select", () => {
    const held = hold(NO_SELECTION, "b");
    const ended = plain(held, "b");
    expect(ended.several).toBe(false);
    expect(ended.ids.size).toBe(0);
  });

  it("stays in several with none selected when it was started with Select", () => {
    const held = plain(startSelecting(NO_SELECTION), "b");
    const ended = plain(held, "b");
    expect(ended.several).toBe(true);
    expect(ended.ids.size).toBe(0);
  });
});

describe("hold", () => {
  it("enters several with only the held tile selected", () => {
    const selected = plain(NO_SELECTION, "b");
    const held = hold(selected, "d");
    expect(held.several).toBe(true);
    expect(held.ids).toEqual(new Set(["d"]));
  });

  it("keeps the held tile selected, never toggling it off", () => {
    const already = hold(NO_SELECTION, "b");
    expect(hold(already, "b").ids).toEqual(new Set(["b"]));
  });
});

describe("startSelecting and endSelecting", () => {
  it("enters several, keeping a single selection in it", () => {
    const selected = plain(NO_SELECTION, "b");
    const started = startSelecting(selected);
    expect(started.several).toBe(true);
    expect(started.startedBySelect).toBe(true);
    expect(started.ids).toEqual(new Set(["b"]));
  });

  it("deselects all and leaves several", () => {
    const ended = endSelecting();
    expect(ended.several).toBe(false);
    expect(ended.ids.size).toBe(0);
  });
});

describe("withoutRemoved", () => {
  it("drops ids no longer in the order", () => {
    const several = ctrl(plain(NO_SELECTION, "b"), "d");
    const pruned = withoutRemoved(several, ["a", "d", "e"]);
    expect(pruned.ids).toEqual(new Set(["d"]));
  });

  it("returns the same instance when nothing was removed", () => {
    const several = ctrl(plain(NO_SELECTION, "b"), "d");
    expect(withoutRemoved(several, ORDER)).toBe(several);
  });
});

describe("soleSelection", () => {
  it("selects only the given id, outside several", () => {
    expect(soleSelection("c")).toEqual({
      ids: new Set(["c"]),
      several: false,
      startedBySelect: false,
      anchor: "c",
    });
  });
});

describe("selectedInOrder", () => {
  it("lists the selected ids in play order, not pick order", () => {
    const several = ctrl(plain(NO_SELECTION, "d"), "b");
    expect(selectedInOrder(several, ORDER)).toEqual(["b", "d"]);
  });
});
