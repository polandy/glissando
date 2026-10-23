import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor, the slideshow's look", () => {
  it("stores the look at once", async () => {
    const { editor, store } = await setUp();

    editor.setSlideshowLook("warm");

    await editor.settled();
    expect((await store.getSlideshow("show")).look).toBe("warm");
  });

  it("back to None drops the look without asking and offers an undo", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setSlideshowLook("cool");

    editor.resetSlideshowLook();

    await editor.settled();
    expect(await store.getSlideshow("show")).not.toHaveProperty("look");
    expect(toaster.current?.text).toBe("Look entfernt");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("the undo brings the previous look back", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setSlideshowLook("cool");
    editor.resetSlideshowLook();

    toaster.act();

    await editor.settled();
    expect((await store.getSlideshow("show")).look).toBe("cool");
  });

  it("a newer look ends the undo, so it never overwrites the newer look", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setSlideshowLook("cool");
    editor.resetSlideshowLook();
    const undo = toaster.current?.action ?? fail();

    editor.setSlideshowLook("vivid");
    undo.run();

    await editor.settled();
    expect(toaster.current).toBeNull();
    expect((await store.getSlideshow("show")).look).toBe("vivid");
  });

  it("back to None while it is already None stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    const callsBefore = store.calls.length;

    editor.resetSlideshowLook();

    expect(store.calls.length).toBe(callsBefore);
    expect(toaster.current).toBeNull();
  });
});

function fail(): never {
  throw new Error("the toast should offer an undo");
}
