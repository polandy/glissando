import { describe, expect, it } from "vitest";
import { stripKeyAction } from "./strip-keys";

// A strip of ten tiles, four per row; the tile in question is the sixth (index 5).
const COUNT = 10;
const COLUMNS = 4;
const action = (
  key: string,
  { shiftKey = false, ctrlKey = false, metaKey = false } = {},
  index = 5,
) => stripKeyAction({ key, shiftKey, ctrlKey, metaKey }, index, COUNT, COLUMNS);

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
    ["ArrowLeft", -1],
    ["ArrowRight", 1],
    ["ArrowUp", -COLUMNS],
    ["ArrowDown", COLUMNS],
  ])("shifts the group with Shift+%s by offset %i, unclamped", (key, offset) => {
    expect(action(key, { shiftKey: true })).toEqual({ kind: "shift", offset });
  });

  it("shifts past the strip's end without clamping: the group order clamps instead", () => {
    expect(action("ArrowDown", { shiftKey: true }, 8)).toEqual({ kind: "shift", offset: COLUMNS });
    expect(action("ArrowUp", { shiftKey: true }, 2)).toEqual({ kind: "shift", offset: -COLUMNS });
  });

  it("leaves the focus where it is at the strip's edge", () => {
    expect(action("ArrowRight", {}, 9)).toEqual({ kind: "none" });
    expect(action("ArrowUp", {}, 2)).toEqual({ kind: "none" });
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

  it("answers Ctrl+Space and ⌘+Space with add-toggle, which enters several", () => {
    expect(action(" ", { ctrlKey: true })).toEqual({ kind: "addToggle" });
    expect(action(" ", { metaKey: true })).toEqual({ kind: "addToggle" });
  });

  it("answers Shift+Space with range", () => {
    expect(action(" ", { shiftKey: true })).toEqual({ kind: "range" });
  });

  it.each(["Tab", "a", "Home"])("leaves %j to the browser", (key) => {
    expect(action(key)).toBeNull();
  });
});
