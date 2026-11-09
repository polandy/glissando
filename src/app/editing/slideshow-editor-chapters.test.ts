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

  it("deleting an added chapter offers an undo that restores it with its text", async () => {
    const { editor, toaster, store } = await setUp(["a", "b"]);
    editor.chapters.insertChapter("b");
    editor.chapters.setAddedChapterTitle("b", "Lisbon");
    editor.chapters.removeAddedChapter("b");
    await editor.settled();
    expect(toaster.current?.text).toBe("Kapitel gelöscht");

    toaster.act();

    await editor.settled();
    expect((await store.getSlideshow("show")).addedChapters).toEqual([
      { beforePictureId: "b", title: "Lisbon" },
    ]);
  });

  it("resetting a chapter's title or subtitle offers an undo restoring the text", async () => {
    const { editor, toaster, store } = await setUp(["a", "b"]);
    editor.chapters.setChapterTitle("b", "Lisbon");
    editor.chapters.resetChapterTitle("b");
    expect(toaster.current?.text).toBe("Kapiteltitel wieder automatisch");
    toaster.act();
    await editor.settled();
    expect((await store.getSlideshow("show")).chapterEdits).toEqual([
      { pictureId: "b", title: "Lisbon" },
    ]);

    editor.chapters.setChapterSubtitle("b", "Day 11");
    editor.chapters.resetChapterSubtitle("b");
    expect(toaster.current?.text).toBe("Kapitel-Untertitel wieder automatisch");
    toaster.act();
    await editor.settled();
    expect((await store.getSlideshow("show")).chapterEdits?.[0]?.subtitle).toBe("Day 11");
  });

  it("resetting an added chapter's title offers an undo; a newer title ends it", async () => {
    const { editor, toaster, store } = await setUp(["a", "b"]);
    editor.chapters.insertChapter("b");
    editor.chapters.setAddedChapterTitle("b", "Lisbon");
    editor.chapters.resetAddedChapterTitle("b");
    toaster.act();
    await editor.settled();
    expect((await store.getSlideshow("show")).addedChapters?.[0]?.title).toBe("Lisbon");

    editor.chapters.resetAddedChapterTitle("b");
    const undo = toaster.current?.action;
    editor.chapters.setAddedChapterTitle("b", "Porto");
    undo?.run();
    await editor.settled();
    expect(toaster.current).toBeNull();
    expect((await store.getSlideshow("show")).addedChapters?.[0]?.title).toBe("Porto");
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
