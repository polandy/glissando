import { describe, expect, it } from "vitest";
import { TOAST_DURATION_MS } from "../toast/toaster";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor", () => {
  it("removes a picture at once, stores it, and offers an undo in a toast", async () => {
    const { editor, toaster, order, storedOrder } = await setUp();

    editor.remove("b");

    expect(order()).toEqual(["a", "c", "d"]);
    expect(await storedOrder()).toEqual(["a", "c", "d"]);
    expect(toaster.current?.text).toBe("Bild entfernt");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("counts removals made while their toast is shown, and one undo restores them all", async () => {
    const { editor, toaster, order, storedOrder } = await setUp();

    editor.remove("b");
    editor.remove("d");
    editor.remove("a");

    expect(toaster.current?.text).toBe("3 Bilder entfernt");
    toaster.act();
    expect(order()).toEqual(["a", "b", "c", "d"]);
    expect(await storedOrder()).toEqual(["a", "b", "c", "d"]);
  });

  it("starts a new count once the removal toast has gone", async () => {
    const { editor, toaster, scheduler, order } = await setUp();
    editor.remove("b");
    scheduler.advance(TOAST_DURATION_MS);

    editor.remove("c");
    expect(toaster.current?.text).toBe("Bild entfernt");
    toaster.act();

    expect(order()).toEqual(["a", "c", "d"]);
  });

  it("starts a new count when another toast replaced the removal toast", async () => {
    const { editor, toaster } = await setUp();
    editor.remove("b");
    toaster.show({ text: "Etwas anderes", tone: "info" });

    editor.remove("c");

    expect(toaster.current?.text).toBe("Bild entfernt");
  });

  it("keeps the last picture and explains in a toast how to discard the slideshow", async () => {
    const { editor, toaster, order, storedOrder } = await setUp(["a"]);

    editor.remove("a");

    expect(order()).toEqual(["a"]);
    expect(await storedOrder()).toEqual(["a"]);
    expect(toaster.current?.text).toBe("Das letzte Bild bleibt.");
    expect(toaster.current?.action).toBeUndefined();
  });

  it("moves a picture, stores the new order and marks it as the user's own", async () => {
    const { editor, store, order, storedOrder } = await setUp();

    editor.move("d", 0);

    expect(order()).toEqual(["d", "a", "b", "c"]);
    expect(await storedOrder()).toEqual(["d", "a", "b", "c"]);
    expect((await store.getSlideshow("show")).ownOrder).toBe(true);
  });

  it("renames the slideshow; an empty title falls back to the automatic one", async () => {
    const { editor, storedTitle } = await setUp();

    editor.rename("Sommer am See");
    expect(await storedTitle()).toBe("Sommer am See");
    editor.rename("  ");
    expect(await storedTitle()).toBe("Juli 2025");
  });

  it("tells its listeners about every edit", async () => {
    const { editor } = await setUp();
    const seen: string[][] = [];
    editor.subscribe((slideshow) => seen.push(slideshow.pictures.map((picture) => picture.id)));

    editor.move("a", 1);
    editor.remove("c");

    expect(seen).toEqual([
      ["b", "a", "c", "d"],
      ["b", "a", "d"],
    ]);
  });

  it("reports saving from the first edit until every edit made so far is stored", async () => {
    const { editor } = await setUp();
    const saving: boolean[] = [];
    editor.subscribeSaving((isSaving) => saving.push(isSaving));

    editor.rename("Sommer am See");
    editor.move("a", 2);

    expect(saving).toEqual([true]);
    await editor.settled();
    expect(saving).toEqual([true, false]);
  });

  it("reports a failed save instead of swallowing it", async () => {
    const { editor, store, errors } = await setUp();
    const failure = new Error("disk full");
    store.updateSlideshow = () => Promise.reject(failure);

    editor.rename("Neu");
    await editor.settled();

    expect(errors).toEqual([failure]);
  });

  it("dismisses its undo toast when the screen closes, leaving other toasts alone", async () => {
    const { editor, toaster } = await setUp();
    editor.remove("a");
    editor.dispose();
    expect(toaster.current).toBeNull();

    toaster.show({ text: "Diashow gelöscht", tone: "info" });
    editor.dispose();
    expect(toaster.current?.text).toBe("Diashow gelöscht");
  });
});
