import { describe, expect, it } from "vitest";
import {
  ChapterAlreadyAddedError,
  insertChapter,
  removeAddedChapter,
  setAddedChapterSubtitle,
  setAddedChapterTitle,
  setAutomaticChaptersOff,
  setChapterHidden,
  setChapterSubtitle,
  setChapterTitle,
} from "./slideshow-edits-chapters";
import { removePicture, takeOutPictures } from "./slideshow-edits";
import { InvalidChapterError } from "./stored-chapters";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 100,
    height: 100,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

function slideshow(
  ids: readonly string[],
  overrides: Partial<StoredSlideshow> = {},
): StoredSlideshow {
  const base: StoredSlideshow = {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: ids.map(picture),
    songs: [],
    secondsPerPicture: 5,
  };
  return { ...base, ...overrides };
}

describe("setAutomaticChaptersOff", () => {
  it("turns automatic chapters off", () => {
    expect(setAutomaticChaptersOff(slideshow(["a"]), true).automaticChaptersOff).toBe(true);
  });

  it("turns them back on by dropping the field", () => {
    const off = slideshow(["a"], { automaticChaptersOff: true });
    expect(setAutomaticChaptersOff(off, false).automaticChaptersOff).toBeUndefined();
  });
});

describe("setChapterTitle / setChapterSubtitle / setChapterHidden", () => {
  it("adds a chapter edit overriding only the title", () => {
    const edited = setChapterTitle(slideshow(["a", "b"]), "b", "Sintra");
    expect(edited.chapterEdits).toEqual([{ pictureId: "b", title: "Sintra" }]);
  });

  it("keeps an existing subtitle override when setting the title", () => {
    const show = slideshow(["a", "b"], { chapterEdits: [{ pictureId: "b", subtitle: "Day 2" }] });
    const edited = setChapterTitle(show, "b", "Sintra");
    expect(edited.chapterEdits).toEqual([{ pictureId: "b", subtitle: "Day 2", title: "Sintra" }]);
  });

  it("resets the title to automatic by passing undefined, dropping the edit once empty", () => {
    const show = slideshow(["a", "b"], { chapterEdits: [{ pictureId: "b", title: "Sintra" }] });
    const edited = setChapterTitle(show, "b", undefined);
    expect(edited.chapterEdits).toBeUndefined();
  });

  it("sets the subtitle independently of the title", () => {
    const show = slideshow(["a", "b"], { chapterEdits: [{ pictureId: "b", title: "Sintra" }] });
    const edited = setChapterSubtitle(show, "b", "Day 2 · Sunday");
    expect(edited.chapterEdits).toEqual([
      { pictureId: "b", title: "Sintra", subtitle: "Day 2 · Sunday" },
    ]);
  });

  it("hides an automatic chapter without touching its text", () => {
    const show = slideshow(["a", "b"], { chapterEdits: [{ pictureId: "b", title: "Sintra" }] });
    const edited = setChapterHidden(show, "b", true);
    expect(edited.chapterEdits).toEqual([{ pictureId: "b", title: "Sintra", hidden: true }]);
  });

  it("unhides a chapter, dropping the edit once nothing is left overridden", () => {
    const show = slideshow(["a", "b"], { chapterEdits: [{ pictureId: "b", hidden: true }] });
    const edited = setChapterHidden(show, "b", false);
    expect(edited.chapterEdits).toBeUndefined();
  });

  it("rejects an empty title", () => {
    expect(() => setChapterTitle(slideshow(["a", "b"]), "b", "")).toThrow(InvalidChapterError);
  });

  it("fails loud for a picture the slideshow does not hold", () => {
    expect(() => setChapterTitle(slideshow(["a", "b"]), "z", "Sintra")).toThrow(
      InvalidChapterError,
    );
  });
});

describe("insertChapter / removeAddedChapter", () => {
  it("inserts a manual chapter with no text override yet", () => {
    const edited = insertChapter(slideshow(["a", "b"]), "b");
    expect(edited.addedChapters).toEqual([{ beforePictureId: "b" }]);
  });

  it("refuses to insert twice before the same picture", () => {
    const show = insertChapter(slideshow(["a", "b"]), "b");
    expect(() => insertChapter(show, "b")).toThrow(ChapterAlreadyAddedError);
  });

  it("fails loud for a picture the slideshow does not hold", () => {
    expect(() => insertChapter(slideshow(["a", "b"]), "z")).toThrow(InvalidChapterError);
  });

  it("removes an added chapter", () => {
    const show = insertChapter(slideshow(["a", "b"]), "b");
    expect(removeAddedChapter(show, "b").addedChapters).toBeUndefined();
  });
});

describe("setAddedChapterTitle / setAddedChapterSubtitle", () => {
  it("sets the added chapter's own title", () => {
    const show = insertChapter(slideshow(["a", "b"]), "b");
    const edited = setAddedChapterTitle(show, "b", "Day trip");
    expect(edited.addedChapters).toEqual([{ beforePictureId: "b", title: "Day trip" }]);
  });

  it("sets the added chapter's own subtitle, keeping its title", () => {
    const show = setAddedChapterTitle(insertChapter(slideshow(["a", "b"]), "b"), "b", "Day trip");
    const edited = setAddedChapterSubtitle(show, "b", "Sunday");
    expect(edited.addedChapters).toEqual([
      { beforePictureId: "b", title: "Day trip", subtitle: "Sunday" },
    ]);
  });

  it("fails loud for a picture with no added chapter", () => {
    expect(() => setAddedChapterTitle(slideshow(["a", "b"]), "b", "Day trip")).toThrow(
      InvalidChapterError,
    );
  });
});

describe("removePicture / takeOutPictures (chapter cleanup)", () => {
  it("drops a chapter edit or added chapter anchored to a removed picture", () => {
    const show = slideshow(["a", "b", "c"], {
      chapterEdits: [{ pictureId: "b", title: "Sintra" }],
      addedChapters: [{ beforePictureId: "b", title: "Day trip" }],
    });
    const { slideshow: edited } = removePicture(show, "b");
    expect(edited.chapterEdits).toBeUndefined();
    expect(edited.addedChapters).toBeUndefined();
  });

  it("keeps a chapter edit or added chapter anchored to a picture that survives removal", () => {
    const show = slideshow(["a", "b", "c"], {
      chapterEdits: [{ pictureId: "c", title: "Sintra" }],
    });
    const { slideshow: edited } = removePicture(show, "b");
    expect(edited.chapterEdits).toEqual([{ pictureId: "c", title: "Sintra" }]);
  });

  it("drops a chapter edit or added chapter anchored to a taken-out picture", () => {
    const show = slideshow(["a", "b", "c"], {
      chapterEdits: [{ pictureId: "b", title: "Sintra" }],
      addedChapters: [{ beforePictureId: "b", title: "Day trip" }],
    });
    const taken = takeOutPictures(show, ["b"]);
    expect(taken.chapterEdits).toBeUndefined();
    expect(taken.addedChapters).toBeUndefined();
  });
});
