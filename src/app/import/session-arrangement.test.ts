import { describe, expect, it } from "vitest";
import type { PictureImportState } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import { SessionArrangement } from "./session-arrangement";

const picture = (id: string): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  fileName: `${id}.jpg`,
  width: 100,
  height: 100,
  colours: { veil: "#404040", accent: "#C0C0C0" },
});

/** A fake `PictureImport` store sliver: publishes the given pictures, nothing else. */
function fakePictures(ids: readonly string[]) {
  const listeners = new Set<(state: PictureImportState) => void>();
  const state = {
    total: 0,
    done: 0,
    pictures: ids.map(picture),
    picks: [],
    skipped: [],
    storageFull: false,
    busy: false,
    failed: false,
  } satisfies PictureImportState;
  return {
    state,
    subscribe: (listener: (state: PictureImportState) => void) => {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    publish: (next: PictureImportState) => {
      for (const listener of listeners) listener(next);
    },
  };
}

function arrangementWith(ids: readonly string[]) {
  const pictures = fakePictures(ids);
  const exempted: string[][] = [];
  const randomValues: number[] = [];
  const arrangement = new SessionArrangement({
    pictures,
    exempt: (exemptedIds) => exempted.push([...exemptedIds]),
    random: () => randomValues.shift() ?? 0,
  });
  return { arrangement, pictures, exempted, randomValues };
}

describe("SessionArrangement", () => {
  it("starts in capture order and follows the ready pictures until something is moved", () => {
    const { arrangement, pictures } = arrangementWith(["a", "b"]);

    expect(arrangement.state).toEqual({ order: ["a", "b"], own: false, moved: new Set() });

    pictures.publish({ ...pictures.state, pictures: ["a", "b", "c"].map(picture) });

    expect(arrangement.state.order).toEqual(["a", "b", "c"]);
  });

  it("orders the given pictures the way the strip shows them", () => {
    const { arrangement } = arrangementWith(["a", "b"]);

    expect(arrangement.orderedPictures(["b", "a"].map(picture))).toEqual(["a", "b"].map(picture));
  });

  it("moves the group, makes the order its own, and exempts the moved pictures from culling", () => {
    const { arrangement, exempted } = arrangementWith(["a", "b", "c"]);

    arrangement.moveGroup(new Set(["c"]), 0);

    expect(arrangement.state).toEqual({ order: ["c", "a", "b"], own: true, moved: new Set(["c"]) });
    expect(exempted).toEqual([["c"]]);
  });

  it("shifts the group, makes the order its own, and exempts it", () => {
    const { arrangement, exempted } = arrangementWith(["a", "b", "c"]);

    arrangement.shiftGroup(new Set(["a"]), 1);

    expect(arrangement.state).toEqual({ order: ["b", "a", "c"], own: true, moved: new Set(["a"]) });
    expect(exempted).toEqual([["a"]]);
  });

  it("shuffles the order from the injected random source and makes it the order's own", () => {
    const { arrangement, randomValues } = arrangementWith(["a", "b", "c", "d"]);
    randomValues.push(0, 0, 0);

    arrangement.shuffle();

    expect(arrangement.state.order).toEqual(["b", "c", "d", "a"]);
    expect(arrangement.state.own).toBe(true);
  });

  it("resets to capture order, not the user's own, forgetting every moved picture", () => {
    const { arrangement } = arrangementWith(["a", "b"]);
    arrangement.moveGroup(new Set(["b"]), 0);

    arrangement.reset();

    expect(arrangement.state).toEqual({ order: [], own: false, moved: new Set() });
  });

  it("tells every listener, now and on change", () => {
    const { arrangement } = arrangementWith(["a"]);
    const seen: boolean[] = [];

    arrangement.subscribe((state) => seen.push(state.own));
    arrangement.moveGroup(new Set(["a"]), 0);

    expect(seen).toEqual([false, true]);
  });
});
