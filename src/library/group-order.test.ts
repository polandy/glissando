import { describe, expect, it } from "vitest";
import { isContiguous, orderWithGroupAt, orderWithGroupShifted } from "./group-order";

const ORDER = ["a", "b", "c", "d", "e"];
const set = (...ids: readonly string[]) => new Set(ids);

describe("orderWithGroupAt", () => {
  it("gathers the group contiguous before the tile at the insertion index", () => {
    expect(orderWithGroupAt(ORDER, set("d"), 0)).toEqual(["d", "a", "b", "c", "e"]);
  });

  it("counts the insertion index in the order as it is now, group members included", () => {
    expect(orderWithGroupAt(["a", "b", "c", "d"], set("a"), 2)).toEqual(["b", "a", "c", "d"]);
  });

  it("keeps the group's own relative order when it has several pictures", () => {
    expect(orderWithGroupAt(ORDER, set("a", "c"), 4)).toEqual(["b", "d", "a", "c", "e"]);
  });

  it("allows an insertion at the very end", () => {
    expect(orderWithGroupAt(ORDER, set("a"), 5)).toEqual(["b", "c", "d", "e", "a"]);
  });

  it("returns the same array instance when the group is already there", () => {
    const moved = orderWithGroupAt(ORDER, set("d"), 0);
    expect(orderWithGroupAt(moved, set("d"), 0)).toBe(moved);
  });

  it("throws for a picture id not in the order", () => {
    expect(() => orderWithGroupAt(ORDER, set("z"), 0)).toThrow(/"z"/);
  });

  it("throws for an empty group", () => {
    expect(() => orderWithGroupAt(ORDER, set(), 0)).toThrow(/at least one/);
  });

  it.each([-1, 6, 1.5])("throws for an out-of-range insertion %j", (insertion) => {
    expect(() => orderWithGroupAt(ORDER, set("a"), insertion)).toThrow(RangeError);
  });
});

describe("orderWithGroupShifted", () => {
  it("gathers a scattered group where its first picture is, moving earlier", () => {
    expect(orderWithGroupShifted(ORDER, set("a", "c", "e"), -1)).toEqual(["a", "c", "e", "b", "d"]);
  });

  it("gathers a scattered group where its last picture is, moving later", () => {
    expect(orderWithGroupShifted(ORDER, set("a", "c"), 1)).toEqual(["b", "a", "c", "d", "e"]);
  });

  it("ignores the offset's size for the first gather", () => {
    expect(orderWithGroupShifted(ORDER, set("a", "c", "e"), -100)).toEqual([
      "a",
      "c",
      "e",
      "b",
      "d",
    ]);
  });

  it("moves a contiguous block earlier by the offset", () => {
    expect(orderWithGroupShifted(["a", "b", "c", "d", "e"], set("b", "c"), -1)).toEqual([
      "b",
      "c",
      "a",
      "d",
      "e",
    ]);
  });

  it("moves a contiguous block later by the offset", () => {
    expect(orderWithGroupShifted(["a", "b", "c", "d", "e"], set("b", "c"), 1)).toEqual([
      "a",
      "d",
      "b",
      "c",
      "e",
    ]);
  });

  it("clamps a contiguous block at the start", () => {
    const atStart = ["a", "b", "c", "d", "e"];
    const unchanged = orderWithGroupShifted(atStart, set("a", "b"), -1);
    expect(unchanged).toBe(atStart);
  });

  it("clamps a contiguous block at the end", () => {
    const atEnd = ["a", "b", "c", "d", "e"];
    const unchanged = orderWithGroupShifted(atEnd, set("d", "e"), 1);
    expect(unchanged).toBe(atEnd);
  });

  it("moves a single id earlier or later, clamped, like the existing single-picture move", () => {
    expect(orderWithGroupShifted(ORDER, set("c"), -1)).toEqual(["a", "c", "b", "d", "e"]);
    expect(orderWithGroupShifted(ORDER, set("a"), -1)).toBe(ORDER);
    expect(orderWithGroupShifted(ORDER, set("e"), 1)).toBe(ORDER);
  });

  it("throws for a picture id not in the order", () => {
    expect(() => orderWithGroupShifted(ORDER, set("z"), -1)).toThrow(/"z"/);
  });

  it("throws for an empty group", () => {
    expect(() => orderWithGroupShifted(ORDER, set(), -1)).toThrow(/at least one/);
  });
});

describe("isContiguous", () => {
  it("is true for a single picture", () => {
    expect(isContiguous(set("c"), ORDER)).toBe(true);
  });

  it("is true for pictures that sit next to each other in play order", () => {
    expect(isContiguous(set("b", "c"), ORDER)).toBe(true);
  });

  it("is false for pictures scattered across the order", () => {
    expect(isContiguous(set("a", "c"), ORDER)).toBe(false);
  });
});
