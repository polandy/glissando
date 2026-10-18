import { describe, expect, it } from "vitest";
import {
  FakeDecoder,
  FillingStore,
  fileNames,
  picture,
  setUp,
} from "./testing/picture-import-fixtures";

describe("PictureImport, picks", () => {
  it("lists one pick per add() call, in pick order, with its own total and done", async () => {
    const { pictureImport, addFiles } = setUp();

    addFiles([picture("a.jpg"), picture("b.jpg")]);
    addFiles([picture("c.jpg")], { kind: "folder", folderName: "Vacation" });
    await pictureImport.settled();

    expect(pictureImport.state.picks).toEqual([
      { id: "pick-1", kind: "files", total: 2, done: 2 },
      { id: "pick-2", kind: "folder", folderName: "Vacation", total: 1, done: 1 },
    ]);
  });

  it("drops a pick's waiting files from the queue and the overall total on stop, keeping what is in", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport, addFiles } = setUp({ decoder });
    addFiles([picture("a.jpg")]);
    await pictureImport.settled();
    decoder.hold();
    addFiles([picture("b.jpg"), picture("c.jpg")]);
    await decoder.reached;

    expect(pictureImport.state).toMatchObject({ total: 3, done: 1, busy: true });
    pictureImport.stop("pick-2");

    expect(pictureImport.state).toMatchObject({ total: 2, done: 1, busy: true });
    expect(pictureImport.state.picks).toEqual([
      { id: "pick-1", kind: "files", total: 1, done: 1 },
      { id: "pick-2", kind: "files", total: 0, done: 0 },
    ]);

    decoder.open();
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 1, done: 1, busy: false });
    expect(pictureImport.state.picks).toEqual([
      { id: "pick-1", kind: "files", total: 1, done: 1 },
      { id: "pick-2", kind: "files", total: 0, done: 0 },
    ]);
  });

  it("drops a pick with nothing yet in flight entirely on stop", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport, addFiles } = setUp({ decoder });
    decoder.hold();

    addFiles([picture("a.jpg")]);
    addFiles([picture("b.jpg"), picture("c.jpg")]);
    await decoder.reached;

    pictureImport.stop("pick-2");
    decoder.open();
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 1, done: 1, busy: false });
    expect(pictureImport.state.picks).toEqual([
      { id: "pick-1", kind: "files", total: 1, done: 1 },
      { id: "pick-2", kind: "files", total: 0, done: 0 },
    ]);
  });

  it("ends the import as if finished when the last unfinished pick is stopped", async () => {
    const decoder = new FakeDecoder();
    const { pictureImport, addFiles } = setUp({ decoder });
    decoder.hold();
    addFiles([picture("a.jpg"), picture("b.jpg")]);
    await decoder.reached;

    pictureImport.stop("pick-1");
    decoder.open();
    await pictureImport.settled();

    expect(pictureImport.state).toMatchObject({ total: 0, done: 0, busy: false, pictures: [] });
  });

  it("refuses to stop an unknown pick", () => {
    const { pictureImport } = setUp();

    expect(() => pictureImport.stop("no-such-pick")).toThrow(/no pick/);
  });

  it("refuses to stop a pick that already finished", async () => {
    const { pictureImport, addFiles } = setUp();
    addFiles([picture("a.jpg")]);
    await pictureImport.settled();

    expect(() => pictureImport.stop("pick-1")).toThrow(/already finished/);
  });

  it("truncates every pick's total to what is done when storage runs full", async () => {
    const { pictureImport, addFiles } = setUp({ store: new FillingStore(1) });

    addFiles([picture("a.jpg"), picture("b.jpg")]);
    await pictureImport.settled();

    expect(pictureImport.state).toMatchObject({ total: 1, done: 1, storageFull: true });
    expect(pictureImport.state.picks).toEqual([{ id: "pick-1", kind: "files", total: 1, done: 1 }]);
  });
});
