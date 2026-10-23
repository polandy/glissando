import { describe, expect, it } from "vitest";
import {
  chaptersWithoutPictures,
  checkAddedChapters,
  checkChapterEdits,
  checkChapterText,
  InvalidChapterError,
} from "./stored-chapters";

const PICTURE_IDS = new Set(["p1", "p2", "p3"]);

describe("checkChapterText", () => {
  it("accepts a caption-shaped string", () => {
    expect(checkChapterText("Lisbon", "chapter", "title")).toBe("Lisbon");
  });

  it("rejects an empty string, unlike a card's text", () => {
    expect(() => checkChapterText("", "chapter", "title")).toThrow(InvalidChapterError);
  });

  it("rejects anything else, naming the field", () => {
    try {
      checkChapterText(42, "chapter", "subtitle");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidChapterError);
      expect((error as InvalidChapterError).field).toBe("subtitle");
    }
  });
});

describe("checkChapterEdits", () => {
  it("accepts an edit naming a picture in the slideshow", () => {
    const edits = checkChapterEdits([{ pictureId: "p1", title: "Lisbon" }], PICTURE_IDS, "show");
    expect(edits).toEqual([{ pictureId: "p1", title: "Lisbon" }]);
  });

  it("keeps hidden only when true", () => {
    const edits = checkChapterEdits([{ pictureId: "p1", hidden: true }], PICTURE_IDS, "show");
    expect(edits).toEqual([{ pictureId: "p1", hidden: true }]);
  });

  it("leaves out an unspecified subtitle rather than storing it as undefined", () => {
    const [edit] = checkChapterEdits([{ pictureId: "p1", title: "Lisbon" }], PICTURE_IDS, "show");
    expect(edit && "subtitle" in edit).toBe(false);
  });

  it("rejects an unknown picture id", () => {
    expect(() => checkChapterEdits([{ pictureId: "z" }], PICTURE_IDS, "show")).toThrow(
      InvalidChapterError,
    );
  });

  it("rejects an empty title", () => {
    expect(() => checkChapterEdits([{ pictureId: "p1", title: "" }], PICTURE_IDS, "show")).toThrow(
      InvalidChapterError,
    );
  });

  it("rejects the same picture named twice", () => {
    expect(() =>
      checkChapterEdits(
        [
          { pictureId: "p1", title: "Lisbon" },
          { pictureId: "p1", title: "Sintra" },
        ],
        PICTURE_IDS,
        "show",
      ),
    ).toThrow(InvalidChapterError);
  });

  it("rejects hidden set to anything but true", () => {
    expect(() =>
      checkChapterEdits([{ pictureId: "p1", hidden: false }], PICTURE_IDS, "show"),
    ).toThrow(InvalidChapterError);
  });
});

describe("checkAddedChapters", () => {
  it("accepts a chapter naming a picture to go before", () => {
    const added = checkAddedChapters(
      [{ beforePictureId: "p2", title: "Porto" }],
      PICTURE_IDS,
      "show",
    );
    expect(added).toEqual([{ beforePictureId: "p2", title: "Porto" }]);
  });

  it("rejects an unknown picture id", () => {
    expect(() => checkAddedChapters([{ beforePictureId: "z" }], PICTURE_IDS, "show")).toThrow(
      InvalidChapterError,
    );
  });

  it("rejects the same picture named twice", () => {
    expect(() =>
      checkAddedChapters(
        [
          { beforePictureId: "p1", title: "A" },
          { beforePictureId: "p1", title: "B" },
        ],
        PICTURE_IDS,
        "show",
      ),
    ).toThrow(InvalidChapterError);
  });
});

describe("chaptersWithoutPictures", () => {
  it("drops a chapter edit anchored to a removed picture", () => {
    const result = chaptersWithoutPictures(
      [{ pictureId: "p1", title: "Lisbon" }],
      undefined,
      new Set(["p1"]),
    );
    expect(result).toEqual({});
  });

  it("drops an added chapter anchored to a removed picture", () => {
    const result = chaptersWithoutPictures(
      undefined,
      [{ beforePictureId: "p2", title: "Porto" }],
      new Set(["p2"]),
    );
    expect(result).toEqual({});
  });

  it("keeps a chapter edit anchored to a picture that survives", () => {
    const result = chaptersWithoutPictures(
      [{ pictureId: "p1", title: "Lisbon" }],
      undefined,
      new Set(["p2"]),
    );
    expect(result).toEqual({ chapterEdits: [{ pictureId: "p1", title: "Lisbon" }] });
  });
});
