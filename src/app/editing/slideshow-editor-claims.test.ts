import { describe, expect, it } from "vitest";
import { SlideshowNotFoundError } from "../../library/stored-slideshow";
import { TOAST_DURATION_MS } from "../toast/toaster";
import { setUp, stored } from "./editor-test-harness";

describe("SlideshowEditor removal batches and slideshows deleted meanwhile", () => {
  it("keeps a removed picture's media from any clean-up until its undo toast expires", async () => {
    const { editor, scheduler, mediaSurvivesCleanUp } = await setUp();

    editor.remove("b");
    expect(await mediaSurvivesCleanUp("a")).toBe(true);
    expect(await mediaSurvivesCleanUp("b")).toBe(true);
    scheduler.advance(TOAST_DURATION_MS);

    expect(await mediaSurvivesCleanUp("a")).toBe(true);
    expect(await mediaSurvivesCleanUp("b")).toBe(false);
  });

  it("claims removed media before storing the removal, and releases it after storing the undo", async () => {
    const { editor, toaster, store, mediaSurvivesCleanUp } = await setUp();
    store.calls.length = 0;

    editor.remove("b");
    editor.remove("d");
    toaster.act();

    expect(store.calls).toEqual([
      "claim b",
      "update acd",
      "claim d",
      "update ac",
      "update abcd",
      "release",
    ]);
    expect(await mediaSurvivesCleanUp("d")).toBe(true);
  });

  it("releases removed media when another toast replaces the undo toast", async () => {
    const { editor, toaster, mediaSurvivesCleanUp } = await setUp();
    editor.remove("b");

    toaster.show({ text: "Etwas anderes", tone: "info" });

    expect(await mediaSurvivesCleanUp("a")).toBe(true);
    expect(await mediaSurvivesCleanUp("b")).toBe(false);
  });

  it("releases removed media when the screen closes", async () => {
    const { editor, mediaSurvivesCleanUp } = await setUp();
    editor.remove("b");

    editor.dispose();

    expect(await mediaSurvivesCleanUp("a")).toBe(true);
    expect(await mediaSurvivesCleanUp("b")).toBe(false);
  });

  it("ends the removal batch on a move, so an undo never restores at shifted positions", async () => {
    const { editor, toaster, order, storedOrder, mediaSurvivesCleanUp } = await setUp();
    editor.remove("b");

    editor.move("d", 0);

    expect(order()).toEqual(["d", "a", "c"]);
    expect(toaster.current).toBeNull();
    expect(await mediaSurvivesCleanUp("b")).toBe(false);
    editor.remove("c");
    expect(toaster.current?.text).toBe("Bild entfernt");
    toaster.act();
    expect(order()).toEqual(["d", "a", "c"]);
    expect(await storedOrder()).toEqual(["d", "a", "c"]);
  });

  it("reports a slideshow deleted meanwhile as gone, once, without bringing it back", async () => {
    const { editor, store, toaster, errors, goneCount } = await setUp();
    await store.saveSlideshow({ ...stored(["x"]), id: "other" });
    await store.deleteSlideshow("show");

    editor.rename("Neu");
    editor.remove("b");
    await editor.settled();

    expect(errors).toEqual([]);
    expect(goneCount()).toBe(1);
    expect(toaster.current).toBeNull();
    expect((await store.listSlideshows()).map((listed) => listed.id)).toEqual(["other"]);
    expect(await rejectionOf(store.getSlideshow("show"))).toBeInstanceOf(SlideshowNotFoundError);
  });
});

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}
