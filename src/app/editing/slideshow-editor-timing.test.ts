import { describe, expect, it } from "vitest";
import type { SlideshowEditor } from "./slideshow-editor";
import { setUp } from "./editor-test-harness";

/** A picture's own duration and own transition share one editing contract. */
const settings = [
  {
    setting: "duration",
    field: "durationMs",
    own: 8000,
    newer: 9500,
    set: (editor: SlideshowEditor, id: string, value: number | string) =>
      editor.setDuration(id, value as number),
    reset: (editor: SlideshowEditor, id: string) => editor.resetDuration(id),
    toast: "Dauer wieder automatisch",
  },
  {
    setting: "transition",
    field: "transition",
    own: "dissolve",
    newer: "cut",
    set: (editor: SlideshowEditor, id: string, value: number | string) =>
      editor.setTransition(id, value as "dissolve" | "cut"),
    reset: (editor: SlideshowEditor, id: string) => editor.resetTransition(id),
    toast: "Übergang wieder automatisch",
  },
] as const;

describe.each(settings)("SlideshowEditor, a picture's own $setting", (timing) => {
  const { field, own, newer, set, reset } = timing;

  it("stores the own value at once", async () => {
    const { editor, storedPicture } = await setUp();

    set(editor, "b", own);

    expect(editor.slideshow.pictures[1]?.[field]).toBe(own);
    expect((await storedPicture("b"))?.[field]).toBe(own);
  });

  it("back to automatic drops the own value without asking and offers an undo", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    set(editor, "b", own);

    reset(editor, "b");

    const picture = await storedPicture("b");
    expect(picture?.id).toBe("b");
    expect(picture).not.toHaveProperty(field);
    expect(toaster.current?.text).toBe(timing.toast);
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("the undo brings the previous own value back", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    set(editor, "b", own);
    reset(editor, "b");

    toaster.act();

    expect((await storedPicture("b"))?.[field]).toBe(own);
  });

  it("the undo of a picture removed meanwhile has nothing to bring back", async () => {
    const { editor, toaster, errors, order } = await setUp();
    set(editor, "b", own);
    reset(editor, "b");
    const undo = toaster.current?.action ?? fail();
    editor.remove("b");

    undo.run();
    await editor.settled();

    expect(order()).toEqual(["a", "c", "d"]);
    expect(errors).toEqual([]);
  });

  it("leaving the slideshow dismisses the undo toast, and its undo no longer applies", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    set(editor, "b", own);
    reset(editor, "b");
    const undo = toaster.current?.action ?? fail();

    editor.dispose();
    undo.run();

    expect((await storedPicture("b"))?.id).toBe("b");
    expect(toaster.current).toBeNull();
    expect(await storedPicture("b")).not.toHaveProperty(field);
  });

  it("a newer value for the picture ends the undo, so it never overwrites the newer value", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    set(editor, "b", own);
    reset(editor, "b");
    const undo = toaster.current?.action ?? fail();

    set(editor, "b", newer);
    undo.run();

    expect(toaster.current).toBeNull();
    expect((await storedPicture("b"))?.[field]).toBe(newer);
  });

  it("a newer value for another picture keeps the undo", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    set(editor, "b", own);
    reset(editor, "b");

    set(editor, "a", newer);
    toaster.act();

    expect((await storedPicture("b"))?.[field]).toBe(own);
  });

  it("back to automatic on an automatic picture stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    set(editor, "a", own);
    await editor.settled();
    const callsBefore = store.calls.length;

    reset(editor, "b");

    expect(store.calls.length).toBe(callsBefore);
    expect(toaster.current).toBeNull();
  });
});

describe("SlideshowEditor, undoing one reset among a picture's own settings", () => {
  it("brings back only the setting that toast dropped", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setDuration("b", 8000);
    editor.setTransition("b", "cut");
    editor.resetDuration("b");
    editor.resetTransition("b");

    toaster.act();

    const picture = await storedPicture("b");
    expect(picture?.transition).toBe("cut");
    expect(picture).not.toHaveProperty("durationMs");
  });
});

function fail(): never {
  throw new Error("the toast should offer an undo");
}
