import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor, the slideshow's default transition", () => {
  it("stores the default at once and leaves the pictures' own transitions alone", async () => {
    const { editor, store, storedPicture } = await setUp();
    editor.setTransition("a", "cut");

    editor.setSlideshowTransition("alternate");

    await editor.settled();
    expect((await store.getSlideshow("show")).transition).toBe("alternate");
    expect((await storedPicture("a"))?.transition).toBe("cut");
  });

  it("back to crossfade drops the default without asking and offers an undo", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setSlideshowTransition("dissolve");

    editor.resetSlideshowTransition();

    await editor.settled();
    expect((await store.getSlideshow("show")).id).toBe("show");
    expect(await store.getSlideshow("show")).not.toHaveProperty("transition");
    expect(toaster.current?.text).toBe("Übergänge wieder auf Überblenden");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("the undo brings the previous default back", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setSlideshowTransition("dissolve");
    editor.resetSlideshowTransition();

    toaster.act();

    await editor.settled();
    expect((await store.getSlideshow("show")).transition).toBe("dissolve");
  });

  it("a newer default ends the undo, so it never overwrites the newer default", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setSlideshowTransition("dissolve");
    editor.resetSlideshowTransition();
    const undo = toaster.current?.action ?? fail();

    editor.setSlideshowTransition("zoom-in");
    undo.run();

    await editor.settled();
    expect(toaster.current).toBeNull();
    expect((await store.getSlideshow("show")).transition).toBe("zoom-in");
  });

  it("back to crossfade while it is the crossfade stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setSlideshowTransition("cut");
    editor.setSlideshowTransition("crossfade");
    await editor.settled();
    const callsBefore = store.calls.length;

    editor.resetSlideshowTransition();

    expect(store.calls.length).toBe(callsBefore);
    expect(toaster.current).toBeNull();
  });
});

function fail(): never {
  throw new Error("the toast should offer an undo");
}
