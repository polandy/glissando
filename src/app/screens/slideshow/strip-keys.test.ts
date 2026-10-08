import { describe, expect, it } from "vitest";
import { dropIndex, stripKeyAction } from "./strip-keys";

// A strip of ten tiles, four per row; the tile in question is the sixth (index 5).
const COUNT = 10;
const COLUMNS = 4;
const action = (key: string, shiftKey = false, index = 5) =>
  stripKeyAction({ key, shiftKey }, index, COUNT, COLUMNS);

describe("stripKeyAction", () => {
  it.each([
    ["ArrowLeft", 4],
    ["ArrowRight", 6],
    ["ArrowUp", 1],
    ["ArrowDown", 9],
  ])("moves the focus with %s to tile %i", (key, index) => {
    expect(action(key)).toEqual({ kind: "focus", index });
  });

  it.each([
    ["ArrowLeft", 4],
    ["ArrowRight", 6],
    ["ArrowUp", 1],
    ["ArrowDown", 9],
  ])("moves the tile itself with Shift+%s to position %i", (key, to) => {
    expect(action(key, true)).toEqual({ kind: "move", to });
  });

  it("keeps a tile moved past the strip's end at the end", () => {
    expect(action("ArrowDown", true, 8)).toEqual({ kind: "move", to: 9 });
    expect(action("ArrowUp", true, 2)).toEqual({ kind: "move", to: 0 });
  });

  it("leaves the focus where it is at the strip's edge", () => {
    expect(action("ArrowRight", false, 9)).toEqual({ kind: "none" });
    expect(action("ArrowUp", false, 2)).toEqual({ kind: "none" });
  });

  it.each([
    ["Enter", "toggle"],
    [" ", "toggle"],
    ["Delete", "remove"],
    ["Backspace", "remove"],
    ["Escape", "deselect"],
  ])("answers %j with %s", (key, kind) => {
    expect(action(key)).toEqual({ kind });
  });

  it.each(["Tab", "a", "Home"])("leaves %j to the browser", (key) => {
    expect(action(key)).toBeNull();
  });
});

describe("dropIndex", () => {
  it.each([
    { from: 0, target: 3, after: false, to: 2 },
    { from: 0, target: 3, after: true, to: 3 },
    { from: 4, target: 1, after: false, to: 1 },
    { from: 4, target: 1, after: true, to: 2 },
  ])("drops tile $from before/after ($after) tile $target at position $to", (drop) => {
    expect(dropIndex(drop.from, drop.target, drop.after)).toBe(drop.to);
  });
});
