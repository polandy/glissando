import { describe, expect, it } from "vitest";
import { PORTRAIT_SIZE, setUp } from "./editor-test-harness";

/** Four portrait pictures: a and b share a slide, so do c and d (ADR-0028). */
const portraitShow = () => setUp(["a", "b", "c", "d"], null, PORTRAIT_SIZE);

describe("SlideshowEditor, splitting a portrait pair", () => {
  it("marks the pair's second picture alone and offers an undo", async () => {
    const { editor, toaster, storedPicture } = await portraitShow();

    editor.splitPair("a");

    await editor.settled();
    expect((await storedPicture("a"))?.alone).toBeUndefined();
    expect((await storedPicture("b"))?.alone).toBe(true);
    expect(toaster.current?.text).toBe("Bild 1 und 2 getrennt");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("splits the same way from the pair's second picture", async () => {
    const { editor, storedPicture } = await portraitShow();

    editor.splitPair("d");

    await editor.settled();
    expect((await storedPicture("c"))?.alone).toBeUndefined();
    expect((await storedPicture("d"))?.alone).toBe(true);
  });

  it("the undo pairs them again", async () => {
    const { editor, toaster, storedPicture } = await portraitShow();
    editor.splitPair("a");

    toaster.act();

    await editor.settled();
    expect((await storedPicture("b"))?.alone).toBeUndefined();
  });

  it("a picture that shares no slide: splitting stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    await editor.settled();
    const callsBefore = store.calls.length;

    editor.splitPair("a");

    expect(store.calls.length).toBe(callsBefore);
    expect(toaster.current).toBeNull();
  });

  it("the 'always alone' switch ends the undo, which would overwrite it", async () => {
    const { editor, toaster, storedPicture } = await portraitShow();
    editor.splitPair("a");
    expect(toaster.current?.text).toBe("Bild 1 und 2 getrennt");

    editor.setPictureAlone("b", false);

    expect(toaster.current).toBeNull();
    await editor.settled();
    expect((await storedPicture("b"))?.alone).toBeUndefined();
  });

  it("the undo of a picture removed meanwhile brings nothing back", async () => {
    const { editor, toaster, store } = await portraitShow();
    editor.splitPair("a");
    const splitUndo = toaster.current?.action;
    editor.remove("b");
    await editor.settled();
    const callsBefore = store.calls.length;

    splitUndo?.run();

    await editor.settled();
    expect(store.calls.length).toBe(callsBefore);
  });
});

describe("SlideshowEditor, pairing an alone picture again", () => {
  it("clears the mark and offers an undo naming the pair", async () => {
    const { editor, toaster, storedPicture } = await portraitShow();
    editor.setPictureAlone("b", true);

    editor.rejoinPair("b");

    await editor.settled();
    expect((await storedPicture("b"))?.alone).toBeUndefined();
    expect(toaster.current?.text).toBe("Bild 1 und 2 wieder ein Paar");
  });

  it("the undo marks it alone again", async () => {
    const { editor, toaster, storedPicture } = await portraitShow();
    editor.setPictureAlone("b", true);
    editor.rejoinPair("b");

    toaster.act();

    await editor.settled();
    expect((await storedPicture("b"))?.alone).toBe(true);
  });

  it("an alone picture that would stay single anyway: stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setPictureAlone("b", true);
    await editor.settled();
    const callsBefore = store.calls.length;

    editor.rejoinPair("b");

    expect(store.calls.length).toBe(callsBefore);
    expect(toaster.current).toBeNull();
  });
});

describe("SlideshowEditor, pairing again takes a later pair apart", () => {
  it("names the later pair that comes apart in the toast", async () => {
    // a+b | c (alone) | d+e → a+b | c+d | e.
    const { editor, toaster, storedPicture } = await setUp(
      ["a", "b", "c", "d", "e"],
      null,
      PORTRAIT_SIZE,
    );
    editor.setPictureAlone("c", true);

    editor.rejoinPair("c");

    await editor.settled();
    expect((await storedPicture("c"))?.alone).toBeUndefined();
    expect(toaster.current?.text).toBe("Bild 3 und 4 wieder ein Paar, 4 und 5 getrennt");
  });

  it("names only the first of a chain of pairs that come apart, then an ellipsis", async () => {
    // a (alone) | b+c | d+e | f → a+b | c+d | e+f.
    const { editor, toaster } = await setUp(["a", "b", "c", "d", "e", "f"], null, PORTRAIT_SIZE);
    editor.setPictureAlone("a", true);

    editor.rejoinPair("a");

    expect(toaster.current?.text).toBe("Bild 1 und 2 wieder ein Paar, 2 und 3 getrennt …");
  });

  it("the undo restores every pair the chain took apart", async () => {
    const { editor, toaster, storedPicture } = await setUp(
      ["a", "b", "c", "d", "e", "f"],
      null,
      PORTRAIT_SIZE,
    );
    editor.setPictureAlone("a", true);
    editor.rejoinPair("a");

    toaster.act();

    await editor.settled();
    expect((await storedPicture("a"))?.alone).toBe(true);
    expect(editor.slideshow.pictures.map((picture) => picture.alone)).toEqual([
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});
