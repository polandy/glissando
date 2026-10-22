import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor's trip chapters (TRIP_CHAPTERS.md)", () => {
  it("stores automaticChaptersOff only once turned on", async () => {
    const { editor, store } = await setUp(["a", "b"]);

    editor.chapters.setAutomaticChaptersOff(true);
    await editor.settled();

    expect((await store.getSlideshow("show")).automaticChaptersOff).toBe(true);
  });

  it("drops automaticChaptersOff once turned back on", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    editor.chapters.setAutomaticChaptersOff(true);
    await editor.settled();

    editor.chapters.setAutomaticChaptersOff(false);
    await editor.settled();

    expect((await store.getSlideshow("show")).automaticChaptersOff).toBeUndefined();
  });

  it("stores an automatic chapter's own title, normalized", async () => {
    const { editor, store } = await setUp(["a", "b"]);

    editor.chapters.setChapterTitle("b", "  Lisbon  ");
    await editor.settled();

    expect((await store.getSlideshow("show")).chapterEdits).toEqual([
      { pictureId: "b", title: "Lisbon" },
    ]);
  });

  it("resets an automatic chapter's title once the field is cleared", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    editor.chapters.setChapterTitle("b", "Lisbon");
    await editor.settled();

    editor.chapters.setChapterTitle("b", "  ");
    await editor.settled();

    expect((await store.getSlideshow("show")).chapterEdits).toBeUndefined();
  });

  it("resets an automatic chapter's title through resetChapterTitle, keeping its subtitle edit", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    editor.chapters.setChapterTitle("b", "Lisbon");
    editor.chapters.setChapterSubtitle("b", "Day 11–12");
    await editor.settled();

    editor.chapters.resetChapterTitle("b");
    await editor.settled();

    expect((await store.getSlideshow("show")).chapterEdits).toEqual([
      { pictureId: "b", subtitle: "Day 11–12" },
    ]);
  });

  it("resets an automatic chapter's subtitle through resetChapterSubtitle", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    editor.chapters.setChapterSubtitle("b", "Day 11–12");
    await editor.settled();

    editor.chapters.resetChapterSubtitle("b");
    await editor.settled();

    expect((await store.getSlideshow("show")).chapterEdits).toBeUndefined();
  });

  it("hides and unhides an automatic chapter", async () => {
    const { editor, store } = await setUp(["a", "b"]);

    editor.chapters.setChapterHidden("b", true);
    await editor.settled();
    expect((await store.getSlideshow("show")).chapterEdits).toEqual([
      { pictureId: "b", hidden: true },
    ]);

    editor.chapters.setChapterHidden("b", false);
    await editor.settled();
    expect((await store.getSlideshow("show")).chapterEdits).toBeUndefined();
  });

  it("inserts an added chapter with automatic text until edited", async () => {
    const { editor, store } = await setUp(["a", "b"]);

    editor.chapters.insertChapter("b");
    await editor.settled();

    expect((await store.getSlideshow("show")).addedChapters).toEqual([{ beforePictureId: "b" }]);
  });

  it("does nothing when a chapter is already added before that picture", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    editor.chapters.insertChapter("b");
    editor.chapters.setAddedChapterTitle("b", "Lisbon");
    await editor.settled();

    editor.chapters.insertChapter("b");
    await editor.settled();

    expect((await store.getSlideshow("show")).addedChapters).toEqual([
      { beforePictureId: "b", title: "Lisbon" },
    ]);
  });

  it("removes an added chapter outright", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    editor.chapters.insertChapter("b");
    await editor.settled();

    editor.chapters.removeAddedChapter("b");
    await editor.settled();

    expect((await store.getSlideshow("show")).addedChapters).toBeUndefined();
  });

  it("stores and resets an added chapter's own title and subtitle", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    editor.chapters.insertChapter("b");
    await editor.settled();

    editor.chapters.setAddedChapterTitle("b", "Lisbon");
    editor.chapters.setAddedChapterSubtitle("b", "Day 11");
    await editor.settled();
    expect((await store.getSlideshow("show")).addedChapters).toEqual([
      { beforePictureId: "b", title: "Lisbon", subtitle: "Day 11" },
    ]);

    editor.chapters.resetAddedChapterTitle("b");
    await editor.settled();
    expect((await store.getSlideshow("show")).addedChapters).toEqual([
      { beforePictureId: "b", subtitle: "Day 11" },
    ]);

    editor.chapters.resetAddedChapterSubtitle("b");
    await editor.settled();
    expect((await store.getSlideshow("show")).addedChapters).toEqual([{ beforePictureId: "b" }]);
  });
});
