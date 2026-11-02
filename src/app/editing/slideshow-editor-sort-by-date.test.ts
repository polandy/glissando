import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor sortByDate", () => {
  it("puts the pictures back in capture order, stores it and ends the own order", async () => {
    const { editor, order, storedOrder } = await setUp();
    editor.shuffle();

    editor.sortByDate();

    expect(order()).toEqual(["a", "b", "c", "d"]);
    expect(await storedOrder()).toEqual(["a", "b", "c", "d"]);
    expect(editor.slideshow.ownOrder).toBeFalsy();
  });

  it("offers an undo in a toast that names the pictures sorted", async () => {
    const { editor, toaster } = await setUp();
    editor.shuffle();

    editor.sortByDate();

    expect(toaster.current?.text).toBe("4 Bilder nach Datum sortiert");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("brings the own order from before back with the undo", async () => {
    const { editor, toaster, order } = await setUp();
    editor.shuffle();
    editor.sortByDate();

    toaster.act();

    expect(order()).toEqual(["b", "c", "d", "a"]);
    expect(editor.slideshow.ownOrder).toBe(true);
  });

  it("keeps a caption typed after the sort when the sort is undone", async () => {
    const { editor, toaster, order } = await setUp();
    editor.shuffle();
    editor.sortByDate();
    editor.setCaption("a", "Lake");

    toaster.act();

    expect(order()).toEqual(["b", "c", "d", "a"]);
    expect(editor.slideshow.pictures.find((picture) => picture.id === "a")?.caption).toBe("Lake");
  });

  it("replaces the shuffle's undo, which would no longer apply", async () => {
    const { editor, toaster } = await setUp();
    editor.shuffle();
    const shuffleToast = toaster.current;

    editor.sortByDate();

    expect(toaster.current).not.toBe(shuffleToast);
    shuffleToast?.action?.run();
    expect(editor.slideshow.ownOrder).toBeFalsy();
  });

  it("does nothing while the order is not the user's own", async () => {
    const { editor, toaster, order } = await setUp();

    editor.sortByDate();

    expect(order()).toEqual(["a", "b", "c", "d"]);
    expect(toaster.current).toBeNull();
  });
});
