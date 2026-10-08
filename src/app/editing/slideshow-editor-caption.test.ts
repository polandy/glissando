import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor, a picture's caption", () => {
  it("stores the caption as it is typed, normalised", async () => {
    const { editor, storedPicture } = await setUp();

    editor.setCaption("b", "Abends  am Steg");

    expect(editor.slideshow.pictures[1]?.caption).toBe("Abends am Steg");
    expect((await storedPicture("b"))?.caption).toBe("Abends am Steg");
  });

  it("an emptied caption is removed from the stored picture", async () => {
    const { editor, storedPicture } = await setUp();
    editor.setCaption("b", "Steg");

    editor.setCaption("b", "");

    const picture = await storedPicture("b");
    expect(picture?.id).toBe("b");
    expect(picture).not.toHaveProperty("caption");
  });

  it("stores nothing when typing changes nothing the caption keeps, like a trailing space", async () => {
    const { editor, store } = await setUp();
    editor.setCaption("b", "Abends");
    await editor.settled();
    const updates = store.calls.length;

    editor.setCaption("b", "Abends ");
    await editor.settled();

    expect(editor.slideshow.pictures[1]?.caption).toBe("Abends");
    expect(store.calls.length).toBe(updates);
  });
});
