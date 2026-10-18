import { describe, expect, it } from "vitest";
import {
  EMPTY_ARRANGEMENT,
  moveGroup,
  reconcile,
  shiftGroup,
  shuffle,
  type ArrangementState,
} from "./import-arrangement";

/** A random source that replays `values`, then repeats the last. */
function randoms(...values: number[]): () => number {
  let next = 0;
  return () => values[Math.min(next++, values.length - 1)] as number;
}

describe("reconcile", () => {
  it("is exactly the ready ids, in capture order, as long as nothing was moved", () => {
    const first = reconcile(EMPTY_ARRANGEMENT, ["a", "b"]);
    expect(first).toEqual({ order: ["a", "b"], own: false, moved: new Set() });

    const grown = reconcile(first, ["a", "b", "c"]);
    expect(grown.order).toEqual(["a", "b", "c"]);
    expect(grown.own).toBe(false);
  });

  it("drops a removed picture from the order on its own, keeping the rest in place", () => {
    const own: ArrangementState = { order: ["c", "a", "b"], own: true, moved: new Set(["c"]) };

    expect(reconcile(own, ["a", "b"])).toEqual({ order: ["a", "b"], own: true, moved: new Set() });
  });

  it("appends a newly ready picture at the end, in capture order among new arrivals", () => {
    const own: ArrangementState = { order: ["b", "a"], own: true, moved: new Set(["b"]) };

    const next = reconcile(own, ["a", "b", "c", "d"]);

    expect(next).toEqual({ order: ["b", "a", "c", "d"], own: true, moved: new Set(["b"]) });
  });
});

describe("moveGroup", () => {
  it("moves the group before the insertion point and makes the order the user's own", () => {
    const state: ArrangementState = { order: ["a", "b", "c", "d"], own: false, moved: new Set() };

    const result = moveGroup(state, new Set(["d"]), 0);

    expect(result).toEqual({ order: ["d", "a", "b", "c"], own: true, moved: new Set(["d"]) });
  });

  it("adds every moved id to the moved set, keeping ids moved earlier", () => {
    const once = moveGroup({ ...EMPTY_ARRANGEMENT, order: ["a", "b", "c"] }, new Set(["c"]), 0);

    const twice = moveGroup(once, new Set(["a"]), 3);

    expect(twice.moved).toEqual(new Set(["c", "a"]));
    expect(twice.order).toEqual(["c", "b", "a"]);
  });
});

describe("shiftGroup", () => {
  it("shifts the group by the given offset and makes the order the user's own", () => {
    const state: ArrangementState = { order: ["a", "b", "c"], own: false, moved: new Set() };

    const result = shiftGroup(state, new Set(["a"]), 1);

    expect(result).toEqual({ order: ["b", "a", "c"], own: true, moved: new Set(["a"]) });
  });
});

describe("shuffle", () => {
  it("puts the pictures in the order the random source picks and makes it the user's own", () => {
    const state: ArrangementState = { order: ["a", "b", "c", "d"], own: false, moved: new Set() };

    const result = shuffle(state, randoms(0, 0, 0));

    expect(result.order).toEqual(["b", "c", "d", "a"]);
    expect(result.own).toBe(true);
  });

  it("does not add anything to moved: shuffling alone does not exempt a picture from culling", () => {
    const state: ArrangementState = { order: ["a", "b", "c"], own: false, moved: new Set() };

    const result = shuffle(state, randoms(0, 0));

    expect(result.moved).toEqual(new Set());
  });
});
