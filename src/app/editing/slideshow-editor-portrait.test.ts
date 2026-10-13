import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor, the portrait pictures setting (ADR-0028)", () => {
  it("stores the choice at once", async () => {
    const { editor, store } = await setUp();

    editor.setPortraitPictures("fill-screen");

    await editor.settled();
    expect((await store.getSlideshow("show")).portraitPictures).toBe("fill-screen");
  });

  it("back to automatic drops the setting without asking and offers an undo", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setPortraitPictures("one-at-a-time");

    editor.resetPortraitPictures();

    await editor.settled();
    expect(await store.getSlideshow("show")).not.toHaveProperty("portraitPictures");
    expect(toaster.current?.text).toBe("Hochformatbilder wieder automatisch");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("the undo brings the previous choice back", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setPortraitPictures("fill-screen");
    editor.resetPortraitPictures();

    toaster.act();

    await editor.settled();
    expect((await store.getSlideshow("show")).portraitPictures).toBe("fill-screen");
  });

  it("already automatic: resetting stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    await editor.settled();
    const callsBefore = store.calls.length;

    editor.resetPortraitPictures();

    expect(store.calls.length).toBe(callsBefore);
    expect(toaster.current).toBeNull();
  });
});

describe("SlideshowEditor, a picture's own 'always alone' setting (ADR-0028)", () => {
  it("marks the picture, stored at once, without a toast", async () => {
    const { editor, toaster, storedPicture } = await setUp();

    editor.setPictureAlone("b", true);

    expect((await storedPicture("b"))?.alone).toBe(true);
    expect(toaster.current).toBeNull();
  });

  it("lets the picture be paired again", async () => {
    const { editor, storedPicture } = await setUp();
    editor.setPictureAlone("b", true);

    editor.setPictureAlone("b", false);

    expect((await storedPicture("b"))?.alone).toBeUndefined();
  });
});
