import { describe, expect, it } from "vitest";
import { fileNames, picture, setUp } from "./testing/picture-import-fixtures";

const DATES = {
  "a.jpg": "2025-07-01T10:00:00Z",
  "b.jpg": "2025-07-02T10:00:00Z",
  "c.jpg": "2025-07-03T10:00:00Z",
};

async function threeStored() {
  const fixture = setUp({ dates: DATES });
  fixture.addFiles([picture("a.jpg"), picture("b.jpg"), picture("c.jpg")]);
  await fixture.pictureImport.settled();
  return fixture;
}

function idOf(
  state: { readonly pictures: readonly { id: string; fileName: string }[] },
  name: string,
) {
  const found = state.pictures.find((stored) => stored.fileName === name);
  if (found === undefined) {
    throw new Error(`no stored picture ${name}`);
  }
  return found.id;
}

describe("PictureImport, removing chosen pictures", () => {
  it("removes a stored picture and counts it out of done and total", async () => {
    const { pictureImport } = await threeStored();

    const removed = pictureImport.remove(idOf(pictureImport.state, "b.jpg"));

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg", "c.jpg"]);
    expect(removed.fileName).toBe("b.jpg");
    expect(pictureImport.state).toMatchObject({ total: 2, done: 2 });
  });

  it("puts restored pictures back in capture-date order and counts them in again", async () => {
    const { pictureImport } = await threeStored();
    const first = pictureImport.remove(idOf(pictureImport.state, "a.jpg"));
    const second = pictureImport.remove(idOf(pictureImport.state, "c.jpg"));

    pictureImport.restore([first, second]);

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(pictureImport.state).toMatchObject({ total: 3, done: 3 });
  });

  it("takes a removed picture in again when it is chosen again, not as chosen twice", async () => {
    const { pictureImport, addFiles } = await threeStored();
    pictureImport.remove(idOf(pictureImport.state, "b.jpg"));

    addFiles([picture("b.jpg")]);
    await pictureImport.settled();

    expect(fileNames(pictureImport.state)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(pictureImport.state.skipped).toEqual([]);
  });

  it("throws on removing a picture it does not have", async () => {
    const { pictureImport } = await threeStored();

    expect(() => pictureImport.remove("unknown")).toThrow(/unknown/);
    expect(fileNames(pictureImport.state)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });
});
