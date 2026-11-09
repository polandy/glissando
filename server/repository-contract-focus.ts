import { expect, it } from "vitest";
import type { LibraryRepository } from "./library-repository";
import {
  PICTURE_ASSET_ID,
  documentTitled,
  slideshow,
  music,
  storedFocus,
} from "./repository-contract-fixtures";

/** Picture focus and transactions. */
export function describeFocusContract(createRepository: () => LibraryRepository): void {
  it("finds no focus for a picture asset id never stored", () => {
    const repository = createRepository();
    expect(repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(new Map());
  });

  it("finds the focus stored for a picture, among the asset ids asked for", () => {
    const repository = createRepository();
    const focus = storedFocus(1);
    expect(repository.putPictureFocus(PICTURE_ASSET_ID, focus, 1000)).toBe("stored");
    expect(repository.findPictureFocus([PICTURE_ASSET_ID, "unasked-for"])).toEqual(
      new Map([[PICTURE_ASSET_ID, focus]]),
    );
  });

  it("replaces a picture's focus when the stored detector is at most the new one", () => {
    const repository = createRepository();
    repository.putPictureFocus(PICTURE_ASSET_ID, storedFocus(1), 1000);
    const refound = storedFocus(1);
    expect(repository.putPictureFocus(PICTURE_ASSET_ID, refound, 2000)).toBe("stored");
    expect(repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(
      new Map([[PICTURE_ASSET_ID, refound]]),
    );
  });

  it("keeps a picture's focus when the stored detector is newer than the new one", () => {
    const repository = createRepository();
    const newer = storedFocus(2);
    repository.putPictureFocus(PICTURE_ASSET_ID, newer, 1000);
    expect(repository.putPictureFocus(PICTURE_ASSET_ID, storedFocus(1), 2000)).toBe("newerKept");
    expect(repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(
      new Map([[PICTURE_ASSET_ID, newer]]),
    );
  });

  it("knows a picture is referenced while a slideshow's document names it", () => {
    const repository = createRepository();
    expect(repository.isPictureReferenced(PICTURE_ASSET_ID)).toBe(false);
    repository.insertSlideshow(slideshow("show-a", 1000));
    expect(repository.isPictureReferenced(PICTURE_ASSET_ID)).toBe(true);
    repository.deleteSlideshow("show-a");
    expect(repository.isPictureReferenced(PICTURE_ASSET_ID)).toBe(false);
  });

  it("deletes a picture's stored focus", () => {
    const repository = createRepository();
    repository.putPictureFocus(PICTURE_ASSET_ID, storedFocus(1), 1000);
    repository.deletePictureFocus(PICTURE_ASSET_ID);
    expect(repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(new Map());
  });

  it("keeps every write of a transaction that completes and returns its result", () => {
    const repository = createRepository();
    const result = repository.inTransaction(() => {
      repository.insertSlideshow(slideshow("show-a", 1000));
      repository.insertMusic(music("music-a", 1000));
      return "done";
    });
    expect(result).toBe("done");
    expect(repository.findSlideshow("show-a")).toBeDefined();
    expect(repository.findMusic("music-a")).toBeDefined();
  });

  it("undoes every write of a transaction that throws, and rethrows", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("kept", 1000));
    const failure = new Error("work failed");
    expect(() =>
      repository.inTransaction(() => {
        repository.insertSlideshow(slideshow("show-a", 2000));
        repository.updateSlideshow("kept", 2, documentTitled("Edited"));
        repository.insertMusic(music("music-a", 1000));
        throw failure;
      }),
    ).toThrow(failure);
    expect(repository.findSlideshow("kept")).toEqual(slideshow("kept", 1000));
    expect(repository.findSlideshow("show-a")).toBeUndefined();
    expect(repository.findMusic("music-a")).toBeUndefined();
  });
}
