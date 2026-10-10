import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor, the undo of an adding", () => {
  it("says how many pictures were added and its undo takes them out again", async () => {
    const { editor, toaster, order, storedOrder } = await setUp(["a", "new-1", "b", "new-2"]);

    editor.offerAddUndo(["new-1", "new-2"]);
    expect(toaster.current?.text).toBe("2 Bilder hinzugefügt");
    expect(toaster.current?.action?.label).toBe("Rückgängig");
    toaster.act();

    expect(order()).toEqual(["a", "b"]);
    expect(await storedOrder()).toEqual(["a", "b"]);
  });

  it("takes out only the added pictures still in the slideshow", async () => {
    const { editor, toaster, order } = await setUp(["a", "new-1", "b", "new-2"]);
    editor.offerAddUndo(["new-1", "new-2"]);
    const undo = toaster.current;
    editor.remove("new-1");
    toaster.dismiss();

    undo?.action?.run();

    expect(order()).toEqual(["a", "b"]);
  });

  it("keeps the last picture when the slideshow holds only added ones, and says why", async () => {
    const { editor, toaster, order } = await setUp(["new-1", "new-2"]);

    editor.offerAddUndo(["new-1", "new-2"]);
    toaster.act();

    expect(order()).toEqual(["new-1", "new-2"]);
    expect(toaster.current?.text).toBe("Das letzte Bild bleibt.");
  });

  it("is no longer offered once the screen closes", async () => {
    const { editor, toaster } = await setUp(["a", "new-1"]);
    editor.offerAddUndo(["new-1"]);

    editor.dispose();

    expect(toaster.current).toBeNull();
  });
});
