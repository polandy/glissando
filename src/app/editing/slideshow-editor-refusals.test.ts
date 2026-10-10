import { describe, expect, it } from "vitest";
import { SlideshowChangedError } from "../../server-library/server-slideshow-store";
import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";
import { setUp, stored } from "./editor-test-harness";

describe("SlideshowEditor, an edit the server refuses", () => {
  it("shows the server's current version when the slideshow changed on another device", async () => {
    const { editor, store, order, refused, errors } = await setUp();
    const current = { ...stored(["a", "b", "x"]), title: "Edited elsewhere" };
    store.refusals.push(new SlideshowChangedError(current));
    const shown: string[][] = [];
    editor.subscribe((slideshow) => shown.push(slideshow.pictures.map(({ id }) => id)));

    editor.remove("d");
    await editor.settled();

    expect(order()).toEqual(["a", "b", "x"]);
    expect(editor.slideshow.title).toBe("Edited elsewhere");
    expect(shown.at(-1)).toEqual(["a", "b", "x"]);
    expect(refused).toEqual(["changed"]);
    expect(errors).toEqual([]);
  });

  it("keeps the last saved version when the server is not answering", async () => {
    const { editor, store, order, refused, errors } = await setUp();
    editor.remove("d");
    await editor.settled();
    store.refusals.push(new ServerLibraryUnavailableError("the edit"));

    editor.remove("c");
    await editor.settled();

    expect(order()).toEqual(["a", "b", "c"]);
    expect(refused).toEqual(["unavailable"]);
    expect(errors).toEqual([]);
  });
});
