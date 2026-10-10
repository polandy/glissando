import { describe, expect, it } from "vitest";
import {
  fileNames,
  picture,
  setUp as setUpImport,
} from "../../import/testing/picture-import-fixtures";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { TOAST_DURATION_MS, Toaster } from "../toast/toaster";
import { PictureRemovals } from "./picture-removals";

async function setUp() {
  const { pictureImport, addFiles } = setUpImport({
    dates: {
      "a.jpg": "2025-07-01T10:00:00Z",
      "b.jpg": "2025-07-02T10:00:00Z",
      "c.jpg": "2025-07-03T10:00:00Z",
    },
  });
  addFiles([picture("a.jpg"), picture("b.jpg"), picture("c.jpg")]);
  await pictureImport.settled();
  const scheduler = new FakeScheduler();
  const toaster = new Toaster(scheduler);
  const removals = new PictureRemovals({
    pictures: pictureImport,
    toaster,
    removedText: (count) => `${count} removed`,
    undoLabel: () => "Undo",
  });
  const remove = (name: string): void => {
    const found = pictureImport.state.pictures.find((stored) => stored.fileName === name);
    if (found === undefined) {
      throw new Error(`no stored picture ${name}`);
    }
    removals.remove(found.id);
  };
  return { pictureImport, toaster, scheduler, removals, remove };
}

describe("PictureRemovals", () => {
  it("removes the picture at once and offers its undo in a toast", async () => {
    const { pictureImport, toaster, remove } = await setUp();

    remove("b.jpg");

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg", "c.jpg"]);
    expect(toaster.current).toMatchObject({ text: "1 removed", action: { label: "Undo" } });
  });

  it("adds up removals made while the toast shows, and one undo puts them all back", async () => {
    const { pictureImport, toaster, remove } = await setUp();
    remove("a.jpg");
    remove("c.jpg");
    expect(toaster.current?.text).toBe("2 removed");

    toaster.act();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(toaster.current).toBeNull();
  });

  it("starts a new count once the toast has gone, and its undo leaves the earlier removal", async () => {
    const { pictureImport, toaster, scheduler, remove } = await setUp();
    remove("a.jpg");
    scheduler.advance(TOAST_DURATION_MS);

    remove("c.jpg");
    expect(toaster.current?.text).toBe("1 removed");
    toaster.act();

    expect(fileNames(pictureImport.state)).toEqual(["b.jpg", "c.jpg"]);
  });

  it("makes the removals final and dismisses their toast on end", async () => {
    const { pictureImport, toaster, removals, remove } = await setUp();
    remove("a.jpg");

    removals.end();
    remove("b.jpg");

    expect(toaster.current?.text).toBe("1 removed");
    toaster.act();
    expect(fileNames(pictureImport.state)).toEqual(["b.jpg", "c.jpg"]);
  });

  it("leaves another toast shown on end", async () => {
    const { toaster, removals, remove } = await setUp();
    remove("a.jpg");
    const other = { text: "Slideshow created", tone: "info" } as const;
    toaster.show(other);

    removals.end();

    expect(toaster.current).toBe(other);
  });
});
