import { describe, expect, it } from "vitest";
import { restoreOrder, shuffleSlideshow, sortSlideshowByCaptureDate } from "./shuffle-edits";
import type { StoredSlideshow } from "./stored-slideshow";

function slideshow(ids: readonly string[], ownOrder?: true): StoredSlideshow {
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
      colours: { veil: "#404040", accent: "#C0C0C0" },
    })),
    songs: [],
    secondsPerPicture: 5,
    ...(ownOrder ? { ownOrder } : {}),
  };
}

const ids = (show: StoredSlideshow) => show.pictures.map((picture) => picture.id);

/** A random source that replays `values`, then repeats the last. */
function randoms(...values: number[]): () => number {
  let next = 0;
  return () => values[Math.min(next++, values.length - 1)] as number;
}

describe("shuffleSlideshow", () => {
  it("puts the same pictures in the order the random source picks and marks it as own", () => {
    const shuffled = shuffleSlideshow(slideshow(["a", "b", "c", "d"]), randoms(0, 0, 0));

    expect(ids(shuffled)).toEqual(["b", "c", "d", "a"]);
    expect(shuffled.ownOrder).toBe(true);
  });

  it("never returns the order it started from, even when the random source would", () => {
    const shuffled = shuffleSlideshow(slideshow(["a", "b", "c"]), randoms(0.99));

    expect(ids(shuffled)).not.toEqual(["a", "b", "c"]);
    expect([...ids(shuffled)].sort()).toEqual(["a", "b", "c"]);
  });

  it("leaves a single picture where it is", () => {
    const single = slideshow(["a"]);

    expect(shuffleSlideshow(single, randoms(0))).toBe(single);
  });
});

describe("restoreOrder", () => {
  it("brings back an earlier order and its own-order flag", () => {
    const shuffled = slideshow(["c", "a", "b"], true);

    const restored = restoreOrder(shuffled, ["a", "b", "c"], undefined);

    expect(ids(restored)).toEqual(["a", "b", "c"]);
    expect(restored.ownOrder).toBeUndefined();
  });

  it("skips pictures removed since and keeps pictures added since at the end", () => {
    const now = slideshow(["c", "x", "a"], true);

    expect(ids(restoreOrder(now, ["a", "b", "c"], undefined))).toEqual(["a", "c", "x"]);
  });
});

describe("sortSlideshowByCaptureDate", () => {
  function dated(captured: Record<string, string>, ownOrder?: true): StoredSlideshow {
    const base = slideshow(Object.keys(captured), ownOrder);
    return {
      ...base,
      pictures: base.pictures.map((picture) => ({
        ...picture,
        capturedAt: captured[picture.id] as string,
      })),
    };
  }

  it("puts every picture in capture-date order and ends the own order", () => {
    const own = dated(
      { c: "2025-07-03T10:00:00Z", a: "2025-07-01T10:00:00Z", b: "2025-07-02T10:00:00Z" },
      true,
    );

    const sorted = sortSlideshowByCaptureDate(own);

    expect(ids(sorted)).toEqual(["a", "b", "c"]);
    expect("ownOrder" in sorted).toBe(false);
  });

  it("breaks a tie in capture time by file name, as the import does", () => {
    const own = dated(
      { z: "2025-07-01T10:00:00Z", y: "2025-07-01T10:00:00Z", x: "2025-07-01T10:00:00Z" },
      true,
    );

    expect(ids(sortSlideshowByCaptureDate(own))).toEqual(["x", "y", "z"]);
  });

  it("returns the same slideshow when the order is not the user's own", () => {
    const sorted = dated({ b: "2025-07-02T10:00:00Z", a: "2025-07-01T10:00:00Z" });

    expect(sortSlideshowByCaptureDate(sorted)).toBe(sorted);
  });

  it("leaves everything but the order and its flag as it was", () => {
    const own = dated({ b: "2025-07-02T10:00:00Z", a: "2025-07-01T10:00:00Z" }, true);
    const withCaption: StoredSlideshow = {
      ...own,
      title: "Lake trip",
      pictures: own.pictures.map((picture) =>
        picture.id === "b" ? { ...picture, caption: "Lake" } : picture,
      ),
    };

    const sorted = sortSlideshowByCaptureDate(withCaption);

    expect(sorted.title).toBe("Lake trip");
    expect(sorted.secondsPerPicture).toBe(5);
    expect(sorted.pictures.find((picture) => picture.id === "b")?.caption).toBe("Lake");
  });
});
