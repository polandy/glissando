import { describe, expect, it } from "vitest";
import { moveGroup, shiftGroup } from "./group-edits";
import type { StoredSlideshow } from "./stored-slideshow";

function slideshow(ids: readonly string[]): StoredSlideshow {
  return {
    id: "show",
    title: "Test",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: ids.map((id) => ({
      id,
      capturedAt: "2025-07-01T10:00:00Z",
      width: 100,
      height: 100,
      fileName: `${id}.jpg`,
    })),
    secondsPerPicture: 5,
  };
}

const ids = (show: StoredSlideshow) => show.pictures.map((picture) => picture.id);

describe("moveGroup", () => {
  it("puts the group's pictures contiguous at the insertion slot and marks the order as own", () => {
    const show = slideshow(["a", "b", "c", "d"]);

    const moved = moveGroup(show, ["d"], 0);

    expect(ids(moved)).toEqual(["d", "a", "b", "c"]);
    expect(moved.ownOrder).toBe(true);
  });

  it("returns the same slideshow instance when the order does not change", () => {
    const show = slideshow(["a", "b", "c"]);

    expect(moveGroup(show, ["a"], 0)).toBe(show);
  });

  it("throws for a picture id not in the slideshow", () => {
    const show = slideshow(["a", "b"]);

    expect(() => moveGroup(show, ["z"], 0)).toThrow(/"z"/);
  });
});

describe("shiftGroup", () => {
  it("gathers a scattered group and marks the order as own", () => {
    const show = slideshow(["a", "b", "c", "d", "e"]);

    const shifted = shiftGroup(show, ["a", "c", "e"], -1);

    expect(ids(shifted)).toEqual(["a", "c", "e", "b", "d"]);
    expect(shifted.ownOrder).toBe(true);
  });

  it("returns the same slideshow instance when the block is already clamped in place", () => {
    const show = slideshow(["a", "b", "c"]);

    expect(shiftGroup(show, ["a"], -1)).toBe(show);
  });
});
