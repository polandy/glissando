import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor, a picture's timing back to automatic", () => {
  it("stores the own values at once", async () => {
    const { editor, storedPicture } = await setUp();

    editor.setDuration("b", 8000);
    editor.setTransition("b", "cut");

    expect(editor.slideshow.pictures[1]?.durationMs).toBe(8000);
    expect((await storedPicture("b"))?.transition).toBe("cut");
  });

  it("drops the own duration and the own transition together, with one undo toast", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setDuration("b", 8000);
    editor.setTransition("b", "cut");

    editor.resetTiming("b");

    const picture = await storedPicture("b");
    expect(picture).not.toHaveProperty("durationMs");
    expect(picture).not.toHaveProperty("transition");
    expect(toaster.current?.text).toBe("Zeitablauf wieder automatisch");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("the undo brings both previous values back", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setDuration("b", 8000);
    editor.setTransition("b", "cut");
    editor.resetTiming("b");

    toaster.act();

    const picture = await storedPicture("b");
    expect(picture?.durationMs).toBe(8000);
    expect(picture?.transition).toBe("cut");
  });

  it("with only the duration own, the undo brings back only that", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setDuration("b", 8000);
    editor.resetTiming("b");

    toaster.act();

    const picture = await storedPicture("b");
    expect(picture?.durationMs).toBe(8000);
    expect(picture).not.toHaveProperty("transition");
  });

  it("a newer own duration ends the undo, so it never overwrites that value", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setDuration("b", 8000);
    editor.resetTiming("b");

    editor.setDuration("b", 9500);

    expect(toaster.current).toBeNull();
    expect((await storedPicture("b"))?.durationMs).toBe(9500);
  });

  it("a newer own transition ends the undo", async () => {
    const { editor, toaster } = await setUp();
    editor.setTransition("b", "cut");
    editor.resetTiming("b");

    editor.setTransition("b", "dissolve");

    expect(toaster.current).toBeNull();
  });

  it("the undo of a picture removed meanwhile has nothing to bring back", async () => {
    const { editor, toaster, errors, order } = await setUp();
    editor.setDuration("b", 8000);
    editor.resetTiming("b");
    const undo = toaster.current?.action ?? fail();
    editor.remove("b");

    undo.run();
    await editor.settled();

    expect(order()).toEqual(["a", "c", "d"]);
    expect(errors).toEqual([]);
  });

  it("leaving the slideshow dismisses the toast, and its undo no longer applies", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setDuration("b", 8000);
    editor.resetTiming("b");
    const undo = toaster.current?.action ?? fail();

    editor.dispose();
    undo.run();

    expect(toaster.current).toBeNull();
    expect(await storedPicture("b")).not.toHaveProperty("durationMs");
  });

  it("a newer value for another picture keeps the undo", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setDuration("b", 8000);
    editor.resetTiming("b");

    editor.setDuration("a", 9500);
    toaster.act();

    expect((await storedPicture("b"))?.durationMs).toBe(8000);
  });

  it("on an automatic picture stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    await editor.settled();
    const updates = store.calls.length;

    editor.resetTiming("b");
    await editor.settled();

    expect(toaster.current).toBeNull();
    expect(store.calls).toHaveLength(updates);
  });
});

function fail(): never {
  throw new Error("the toast should offer an undo");
}
