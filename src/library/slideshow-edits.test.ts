import { describe, expect, it } from "vitest";
import {
  LastPictureError,
  MAX_TITLE_LENGTH,
  movePicture,
  removePicture,
  renameSlideshow,
  restorePictures,
  setPictureCaption,
  setPictureKenBurns,
} from "./slideshow-edits";
import { InvalidOwnKenBurnsError } from "./own-ken-burns";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

function picture(id: string): StoredPicture {
  return { id, capturedAt: "2025-07-01T10:00:00Z", width: 100, height: 100, fileName: `${id}.jpg` };
}

function slideshow(ids: readonly string[], overrides: Partial<StoredSlideshow> = {}) {
  const base: StoredSlideshow = {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: ids.map(picture),
    secondsPerPicture: 5,
  };
  return { ...base, ...overrides };
}

const ids = (show: StoredSlideshow) => show.pictures.map((p) => p.id);

describe("removePicture", () => {
  it("drops the picture and remembers where it stood", () => {
    const { slideshow: edited, removed } = removePicture(slideshow(["a", "b", "c"]), "b");

    expect(ids(edited)).toEqual(["a", "c"]);
    expect(removed).toEqual({ picture: picture("b"), index: 1 });
  });

  it("refuses to remove the last picture: a slideshow keeps at least one", () => {
    expect(() => removePicture(slideshow(["a"]), "a")).toThrow(LastPictureError);
  });

  it("fails loud for a picture the slideshow does not hold", () => {
    expect(() => removePicture(slideshow(["a", "b"]), "z")).toThrow(/"z"/);
  });
});

describe("restorePictures", () => {
  it("puts pictures removed one after another back at their former positions", () => {
    const original = slideshow(["a", "b", "c", "d", "e"]);
    const first = removePicture(original, "b");
    const second = removePicture(first.slideshow, "e");
    const third = removePicture(second.slideshow, "a");

    const restored = restorePictures(third.slideshow, [
      first.removed,
      second.removed,
      third.removed,
    ]);

    expect(ids(restored)).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("movePicture", () => {
  it.each([
    { id: "a", to: 2, order: ["b", "c", "a"] },
    { id: "c", to: 0, order: ["c", "a", "b"] },
    { id: "b", to: 1, order: ["a", "b", "c"] },
  ])("moves $id to position $to", ({ id, to, order }) => {
    expect(ids(movePicture(slideshow(["a", "b", "c"]), id, to))).toEqual(order);
  });

  it("marks the order as the user's own once a picture moved", () => {
    expect(movePicture(slideshow(["a", "b"]), "a", 1).ownOrder).toBe(true);
  });

  it("leaves the slideshow as it is when the picture stays where it is", () => {
    const unchanged = slideshow(["a", "b"]);

    expect(movePicture(unchanged, "a", 0)).toBe(unchanged);
  });

  it("rejects a position outside the slideshow", () => {
    expect(() => movePicture(slideshow(["a", "b"]), "a", 2)).toThrow(RangeError);
    expect(() => movePicture(slideshow(["a", "b"]), "a", -1)).toThrow(RangeError);
  });
});

describe("renameSlideshow", () => {
  it("takes the typed title without surrounding spaces", () => {
    expect(renameSlideshow(slideshow(["a"]), "  Sommer am See ", "July 2025").title).toBe(
      "Sommer am See",
    );
  });

  it.each(["", "   "])("falls back to the automatic title for %j", (typed) => {
    expect(renameSlideshow(slideshow(["a"], { title: "Old" }), typed, "July 2025").title).toBe(
      "July 2025",
    );
  });

  it("cuts a title longer than 80 characters", () => {
    const renamed = renameSlideshow(slideshow(["a"]), "x".repeat(100), "July 2025");

    expect(renamed.title).toHaveLength(MAX_TITLE_LENGTH);
    expect(MAX_TITLE_LENGTH).toBe(80);
  });
});

const motion = {
  from: { zoom: 1, centerX: 0.4, centerY: 0.5 },
  to: { zoom: 2, centerX: 0.6, centerY: 0.5 },
};

describe("setPictureKenBurns", () => {
  it("gives the picture its own motion and leaves the others automatic", () => {
    const edited = setPictureKenBurns(slideshow(["a", "b"]), "b", motion);

    expect(edited.pictures[1]?.kenBurns).toEqual(motion);
    expect(edited.pictures[0]).toEqual(picture("a"));
  });

  it("without a motion makes the picture automatic again: the field is gone", () => {
    const own = setPictureKenBurns(slideshow(["a"]), "a", motion);

    const automatic = setPictureKenBurns(own, "a", undefined);

    expect(automatic.pictures[0]?.id).toBe("a");
    expect(automatic.pictures[0]).not.toHaveProperty("kenBurns");
  });

  it("refuses a motion outside the zoom range, so no invalid record is stored", () => {
    const tooFar = { ...motion, to: { zoom: 4, centerX: 0.5, centerY: 0.5 } };

    expect(() => setPictureKenBurns(slideshow(["a"]), "a", tooFar)).toThrow(
      InvalidOwnKenBurnsError,
    );
  });

  it("keeps the own motion with its picture when the picture moves", () => {
    const own = setPictureKenBurns(slideshow(["a", "b", "c"]), "a", motion);

    const moved = movePicture(own, "a", 2);

    expect(ids(moved)).toEqual(["b", "c", "a"]);
    expect(moved.pictures[2]?.kenBurns).toEqual(motion);
  });

  it("keeps the own motion through a removal and its undo", () => {
    const own = setPictureKenBurns(slideshow(["a", "b"]), "b", motion);
    const { slideshow: without, removed } = removePicture(own, "b");

    const restored = restorePictures(without, [removed]);

    expect(restored.pictures[1]?.kenBurns).toEqual(motion);
  });
});

describe("setPictureCaption", () => {
  it("gives the picture the caption, normalised, and leaves the others without", () => {
    const edited = setPictureCaption(slideshow(["a", "b"]), "b", "  Evening\non the   jetty ");

    expect(edited.pictures[1]?.caption).toBe("Evening on the jetty");
    expect(edited.pictures[0]).toEqual(picture("a"));
  });

  it("with only whitespace removes the caption: the field is gone", () => {
    const captioned = setPictureCaption(slideshow(["a"]), "a", "Jetty");

    const cleared = setPictureCaption(captioned, "a", "  ");

    expect(cleared.pictures[0]?.id).toBe("a");
    expect(cleared.pictures[0]).not.toHaveProperty("caption");
  });

  it("keeps the picture's own motion", () => {
    const own = setPictureKenBurns(slideshow(["a"]), "a", motion);

    const captioned = setPictureCaption(own, "a", "Jetty");

    expect(captioned.pictures[0]?.kenBurns).toEqual(motion);
  });

  it("keeps the caption with its picture when the picture moves", () => {
    const captioned = setPictureCaption(slideshow(["a", "b", "c"]), "a", "Jetty");

    const moved = movePicture(captioned, "a", 2);

    expect(moved.pictures[2]?.caption).toBe("Jetty");
  });
});
