import { describe, expect, it } from "vitest";
import { fileNames, setUp } from "./testing/picture-import-fixtures";

describe("PictureImport, linking pictures without storing them", () => {
  it("lists linked pictures as they are, without storing them, ordered and counted as done", async () => {
    const { pictureImport, store } = setUp();
    const linked = (id: string, capturedAt: string) => ({
      id,
      immichAssetId: id,
      capturedAt,
      width: 3,
      height: 2,
      fileName: `${id}.jpg`,
    });

    pictureImport.link(
      [linked("late", "2025-07-02T00:00:00Z"), linked("early", "2025-07-01T00:00:00Z")],
      [{ fileName: "twice.jpg", reason: "chosenTwice" }],
    );

    expect(pictureImport.state).toMatchObject({
      total: 3,
      done: 3,
      busy: false,
      skipped: [{ fileName: "twice.jpg", reason: "chosenTwice" }],
    });
    expect(fileNames(pictureImport.state)).toEqual(["early.jpg", "late.jpg"]);
    await expect(store.pictureBlob("early")).rejects.toThrow(/no media/);
  });
});
