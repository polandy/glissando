import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor shuffle", () => {
  it("puts the pictures in a new order at once, stores it and marks it as own", async () => {
    const { editor, order, storedOrder } = await setUp();

    editor.shuffle();

    expect(order()).toEqual(["b", "c", "d", "a"]);
    expect(await storedOrder()).toEqual(["b", "c", "d", "a"]);
    expect(editor.slideshow.ownOrder).toBe(true);
  });

  it("offers an undo in a toast that names the pictures shuffled", async () => {
    const { editor, toaster } = await setUp();

    editor.shuffle();

    expect(toaster.current?.text).toBe("4 Bilder gemischt");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("brings the previous order back with the undo", async () => {
    const { editor, toaster, order, storedOrder } = await setUp();
    editor.shuffle();

    toaster.act();

    expect(order()).toEqual(["a", "b", "c", "d"]);
    expect(await storedOrder()).toEqual(["a", "b", "c", "d"]);
    expect(editor.slideshow.ownOrder).toBeFalsy();
  });

  it("keeps a caption typed after the shuffle when the shuffle is undone", async () => {
    const { editor, toaster, order } = await setUp();
    editor.shuffle();
    editor.setCaption("a", "Lake");

    toaster.act();

    expect(order()).toEqual(["a", "b", "c", "d"]);
    expect(editor.slideshow.pictures[0]?.caption).toBe("Lake");
  });

  it("ends a removal's undo, which would put pictures back at shifted positions", async () => {
    const { editor, toaster, order } = await setUp();
    editor.remove("b");

    editor.shuffle();
    toaster.act();

    expect(order()).toEqual(["a", "c", "d"]);
  });

  it("leaves a single picture alone and shows no toast", async () => {
    const { editor, toaster, order } = await setUp(["a"]);

    editor.shuffle();

    expect(order()).toEqual(["a"]);
    expect(toaster.current).toBeNull();
  });
});
