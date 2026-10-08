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
    const automatic = pictureKenBurns(2, editor.slideshow.pictures[2] ?? fail());

    editor.swapKenBurns("c");

    expect((await storedPicture("c"))?.kenBurns).toEqual({
      from: automatic.to,
      to: automatic.from,
    });
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
