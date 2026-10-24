import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor, the slideshow's mood", () => {
  it("stores the mood at once", async () => {
    const { editor, store } = await setUp();

    editor.mood.set("calm");

    await editor.settled();
    expect((await store.getSlideshow("show")).mood).toBe("calm");
  });

  it("set(undefined) stores Custom at once, with no undo toast", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("lively");

    editor.mood.set(undefined);

    await editor.settled();
    expect(await store.getSlideshow("show")).not.toHaveProperty("mood");
    expect(toaster.current).toBeNull();
  });

  it("back to Custom drops the mood without asking and offers an undo", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("calm");

    editor.mood.reset();

    await editor.settled();
    expect(await store.getSlideshow("show")).not.toHaveProperty("mood");
    expect(toaster.current?.text).toBe("Stimmung wieder auf Eigene");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("the undo brings the previous mood back", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("calm");
    editor.mood.reset();

    toaster.act();

    await editor.settled();
    expect((await store.getSlideshow("show")).mood).toBe("calm");
  });

  it("back to Custom while already Custom stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    const callsBefore = store.calls.length;

    editor.mood.reset();

    expect(store.calls.length).toBe(callsBefore);
    expect(toaster.current).toBeNull();
  });

  it("setting the default transition while a mood is active turns the mood to Custom", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("calm");
    await editor.settled();

    editor.setSlideshowTransition("alternate");

    await editor.settled();
    expect(await store.getSlideshow("show")).not.toHaveProperty("mood");
    expect(toaster.current?.text).toBe("Stimmung ist jetzt Eigene");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("the transition change's undo restores the mood and the transition as they were", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("calm");
    await editor.settled();

    editor.setSlideshowTransition("alternate");
    toaster.act();

    await editor.settled();
    const slideshow = await store.getSlideshow("show");
    expect(slideshow.mood).toBe("calm");
    expect(slideshow).not.toHaveProperty("transition");
  });

  it("setting the picture length while a mood is active turns the mood to Custom", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("calm");
    await editor.settled();

    editor.setPictureLength("seconds");

    await editor.settled();
    expect(await store.getSlideshow("show")).not.toHaveProperty("mood");
    expect(toaster.current?.text).toBe("Stimmung ist jetzt Eigene");
  });

  it("the picture length change's undo restores the mood as it was", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("calm");
    await editor.settled();

    editor.setPictureLength("seconds");
    toaster.act();

    await editor.settled();
    expect((await store.getSlideshow("show")).mood).toBe("calm");
  });

  it("setting the seconds per picture while a mood is active turns the mood to Custom", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("lively");
    await editor.settled();

    editor.setSecondsPerPicture(4);

    await editor.settled();
    expect(await store.getSlideshow("show")).not.toHaveProperty("mood");
    expect(toaster.current?.text).toBe("Stimmung ist jetzt Eigene");
  });

  it("the seconds per picture change's undo restores the mood as it was", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("lively");
    await editor.settled();

    editor.setSecondsPerPicture(4);
    toaster.act();

    await editor.settled();
    const slideshow = await store.getSlideshow("show");
    expect(slideshow.mood).toBe("lively");
    expect(slideshow.secondsPerPicture).toBe(5);
  });

  it("without a mood, setting the default transition shows no mood toast", async () => {
    const { editor, toaster } = await setUp();

    editor.setSlideshowTransition("alternate");

    expect(toaster.current).toBeNull();
  });

  it("leave writes the mood's settings into the single ones and drops the mood", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("lively");
    await editor.settled();

    editor.mood.leave();

    await editor.settled();
    const slideshow = await store.getSlideshow("show");
    expect(slideshow).not.toHaveProperty("mood");
    expect(slideshow.pictureLength).toBe("seconds");
    expect(slideshow.secondsPerPicture).toBe(3);
    expect(slideshow.transition).toBe("alternate");
    expect(toaster.current?.text).toBe("Stimmung ist jetzt Eigene");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("leave's undo restores the slideshow as it was before it left the mood", async () => {
    const { editor, toaster, store } = await setUp();
    editor.mood.set("lively");
    await editor.settled();

    editor.mood.leave();
    toaster.act();

    await editor.settled();
    const slideshow = await store.getSlideshow("show");
    expect(slideshow.mood).toBe("lively");
    expect(slideshow).not.toHaveProperty("pictureLength");
    expect(slideshow.secondsPerPicture).toBe(5);
  });

  it("leave while already Custom stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    const callsBefore = store.calls.length;

    editor.mood.leave();

    expect(store.calls.length).toBe(callsBefore);
    expect(toaster.current).toBeNull();
  });
});
