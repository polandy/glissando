import { describe, expect, it } from "vitest";
import { pictureKenBurns } from "../../compose";
import { setUp } from "./editor-test-harness";

const own = {
  from: { zoom: 2, centerX: 0.4, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
};

describe("SlideshowEditor, a picture's own motion", () => {
  it("stores the own motion at once", async () => {
    const { editor, storedPicture } = await setUp();

    editor.setKenBurns("b", own);

    expect(editor.slideshow.pictures[1]?.kenBurns).toEqual(own);
    expect((await storedPicture("b"))?.kenBurns).toEqual(own);
  });

  it("back to automatic drops the own motion without asking and offers an undo", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setKenBurns("b", own);

    editor.resetKenBurns("b");

    const picture = await storedPicture("b");
    expect(picture?.id).toBe("b");
    expect(picture).not.toHaveProperty("kenBurns");
    expect(toaster.current?.text).toBe("Bewegung wieder automatisch");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
  });

  it("the undo brings the previous own motion back", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setKenBurns("b", own);
    editor.resetKenBurns("b");

    toaster.act();

    expect((await storedPicture("b"))?.kenBurns).toEqual(own);
  });

  it("the undo of a picture removed meanwhile has nothing to bring back", async () => {
    const { editor, toaster, errors } = await setUp();
    editor.setKenBurns("b", own);
    editor.resetKenBurns("b");
    const undo = toaster.current?.action ?? fail();
    editor.remove("b");

    undo.run();
    await editor.settled();

    expect(editor.slideshow.pictures.map((picture) => picture.id)).toEqual(["a", "c", "d"]);
    expect(errors).toEqual([]);
  });

  it("leaving the slideshow dismisses the undo toast, and its undo no longer applies", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setKenBurns("b", own);
    editor.resetKenBurns("b");
    const undo = toaster.current?.action ?? fail();

    editor.dispose();
    undo.run();

    expect((await storedPicture("b"))?.id).toBe("b");
    expect(toaster.current).toBeNull();
    expect(await storedPicture("b")).not.toHaveProperty("kenBurns");
  });

  it("a new motion for the picture ends the undo, so it never overwrites the newer motion", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setKenBurns("b", own);
    editor.resetKenBurns("b");
    const undo = toaster.current?.action ?? fail();

    editor.swapKenBurns("b");
    const newer = (await storedPicture("b"))?.kenBurns;
    undo.run();

    expect(newer).toBeDefined();
    expect(toaster.current).toBeNull();
    expect((await storedPicture("b"))?.kenBurns).toEqual(newer);
  });

  it("a new motion for another picture keeps the undo", async () => {
    const { editor, toaster, storedPicture } = await setUp();
    editor.setKenBurns("b", own);
    editor.resetKenBurns("b");

    editor.setKenBurns("a", own);
    toaster.act();

    expect((await storedPicture("b"))?.kenBurns).toEqual(own);
  });

  it("back to automatic on an automatic picture stores nothing and shows no toast", async () => {
    const { editor, toaster, store } = await setUp();
    editor.setKenBurns("a", own);
    await editor.settled();
    const callsBefore = store.calls.length;

    editor.resetKenBurns("b");

    expect(store.calls.length).toBe(callsBefore);
    expect(toaster.current).toBeNull();
  });

  it("swapping start and end of an automatic picture makes it an own motion, reversed", async () => {
    const { editor, storedPicture } = await setUp();
    const automatic = pictureKenBurns(2, editor.slideshow.pictures[2] ?? fail(), undefined);

    editor.swapKenBurns("c");

    expect((await storedPicture("c"))?.kenBurns).toEqual({
      from: automatic.to,
      to: automatic.from,
    });
  });

  it("swapping an automatic picture reverses the motion aimed at its focus", async () => {
    const { editor, storedPicture, focus } = await setUp();
    const faces = { kind: "subject", box: { x: 0.7, y: 0.6, width: 0.2, height: 0.2 } } as const;
    focus.set("c", faces);
    const aimed = pictureKenBurns(2, editor.slideshow.pictures[2] ?? fail(), faces);

    editor.swapKenBurns("c");

    expect((await storedPicture("c"))?.kenBurns).toEqual({ from: aimed.to, to: aimed.from });
  });

  it("swapping an own motion reverses it", async () => {
    const { editor, storedPicture } = await setUp();
    editor.setKenBurns("a", own);

    editor.swapKenBurns("a");

    expect((await storedPicture("a"))?.kenBurns).toEqual({ from: own.to, to: own.from });
  });
});

function fail(): never {
  throw new Error("the slideshow should hold the picture");
}
