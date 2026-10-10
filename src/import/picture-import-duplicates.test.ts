import { describe, expect, it } from "vitest";
import { FakeDecoder, fileNames, picture, setUp } from "./testing/picture-import-fixtures";

describe("PictureImport, skipping and taking in duplicates", () => {
  it("skips files that are not pictures as unsupported without counting them", async () => {
    const { pictureImport, addFiles, decoder } = setUp();

    addFiles([picture("notes.txt", "text/plain"), picture("a.jpg")]);

    expect(pictureImport.state.skipped).toEqual([{ fileName: "notes.txt", reason: "unsupported" }]);
    await pictureImport.settled();
    expect(decoder.decoded).toEqual(["a.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 1, done: 1 });
  });

  it("skips a picture the slideshow already has as already in, without decoding it", async () => {
    const { pictureImport, addFiles, decoder } = setUp({
      dates: { "a.jpg": "2025-07-01T10:00:00Z" },
      known: [{ fileName: "a.jpg", capturedAt: "2025-07-01T10:00:00Z", fileBytes: 5 }],
    });

    addFiles([picture("a.jpg"), picture("b.jpg")]);
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["b.jpg"]);
    expect(pictureImport.state.skipped).toEqual([{ fileName: "a.jpg", reason: "alreadyIn" }]);
    expect(pictureImport.state).toMatchObject({ total: 2, done: 2 });
    expect(decoder.decoded).toEqual(["b.jpg"]);
  });

  it("skips a picture chosen twice in the same import as chosen twice", async () => {
    const { pictureImport, addFiles } = setUp();

    addFiles([picture("a.jpg")]);
    addFiles([picture("a.jpg")]);
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg"]);
    expect(pictureImport.state.skipped).toEqual([{ fileName: "a.jpg", reason: "chosenTwice" }]);
  });

  it("takes the pictures skipped as already in after all on addDuplicates, keeping the other skips", async () => {
    const { pictureImport, addFiles } = setUp({
      decoder: new FakeDecoder(new Set(["broken.jpg"])),
      known: [{ fileName: "a.jpg", capturedAt: "2025-07-01T10:00:00Z" }],
    });
    addFiles([picture("a.jpg"), picture("broken.jpg"), picture("b.jpg")]);
    await pictureImport.settled();

    pictureImport.addDuplicates("alreadyIn");
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg", "b.jpg"]);
    expect(pictureImport.state.skipped).toEqual([{ fileName: "broken.jpg", reason: "unreadable" }]);
    expect(pictureImport.state).toMatchObject({ total: 3, done: 3, busy: false });
  });

  it("takes in only the duplicates of the reason asked for on addDuplicates", async () => {
    const { pictureImport, addFiles } = setUp({
      dates: { "a.jpg": "2025-07-01T10:00:00Z", "b.jpg": "2025-07-02T10:00:00Z" },
      known: [{ fileName: "a.jpg", capturedAt: "2025-07-01T10:00:00Z" }],
    });
    addFiles([picture("a.jpg"), picture("b.jpg"), picture("b.jpg")]);
    await pictureImport.settled();

    pictureImport.addDuplicates("chosenTwice");
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["b.jpg", "b.jpg"]);
    expect(pictureImport.state.skipped).toEqual([{ fileName: "a.jpg", reason: "alreadyIn" }]);
    expect(pictureImport.state).toMatchObject({ total: 3, done: 3, busy: false });
  });
});
