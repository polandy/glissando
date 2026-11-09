import { expect, it } from "vitest";
import type { LibraryRepository } from "./library-repository";
import { TOKEN_A, TOKEN_B, documentTitled, slideshow } from "./repository-contract-fixtures";

/** Slideshows and their share links. */
export function describeSlideshowsContract(createRepository: () => LibraryRepository): void {
  it("finds a slideshow inserted, with its revision, creation time and document", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    expect(repository.findSlideshow("show-a")).toEqual(slideshow("show-a", 1000));
  });

  it("finds no slideshow under an id never inserted", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    expect(repository.findSlideshow("show-a")).toBeDefined();
    expect(repository.findSlideshow("show-b")).toBeUndefined();
  });

  it("lists the newest creation first, and of equal times the later inserted first", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("old", 1000));
    repository.insertSlideshow(slideshow("new", 3000));
    repository.insertSlideshow(slideshow("same-time-first", 2000));
    repository.insertSlideshow(slideshow("same-time-second", 2000));
    expect(repository.listSlideshows().map(({ id }) => id)).toEqual([
      "new",
      "same-time-second",
      "same-time-first",
      "old",
    ]);
  });

  it("replaces a slideshow's revision and document, keeping its creation time", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    const edited = documentTitled("Edited");
    repository.updateSlideshow("show-a", 2, edited);
    expect(repository.findSlideshow("show-a")).toEqual({
      id: "show-a",
      revision: 2,
      createdAt: 1000,
      document: edited,
    });
  });

  it("deletes a slideshow and keeps the others", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    repository.insertSlideshow(slideshow("show-b", 2000));
    repository.deleteSlideshow("show-a");
    expect(repository.listSlideshows().map(({ id }) => id)).toEqual(["show-b"]);
  });

  it("finds no share link for a slideshow never shared", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    expect(repository.findSlideshow("show-a")).toBeDefined();
    expect(repository.shareOf("show-a")).toBeUndefined();
  });

  it("finds a slideshow's share link by the slideshow and the slideshow by its token", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    repository.insertSlideshow(slideshow("show-b", 2000));
    repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
    expect(repository.shareOf("show-a")).toEqual({ token: TOKEN_A, createdAt: 5000 });
    expect(repository.shareOf("show-b")).toBeUndefined();
    expect(repository.slideshowByShareToken(TOKEN_A)).toEqual(slideshow("show-a", 1000));
    expect(repository.slideshowByShareToken(TOKEN_B)).toBeUndefined();
  });

  it("finds the slideshow by its token with its current revision and document", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
    repository.updateSlideshow("show-a", 2, documentTitled("Edited"));
    expect(repository.slideshowByShareToken(TOKEN_A)).toMatchObject({
      revision: 2,
      document: documentTitled("Edited"),
    });
  });

  it("deletes a share link on unshare, keeping the slideshow and other links", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    repository.insertSlideshow(slideshow("show-b", 2000));
    repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
    repository.share("show-b", { token: TOKEN_B, createdAt: 5000 });
    repository.unshare("show-a");
    expect(repository.findSlideshow("show-a")).toBeDefined();
    expect(repository.shareOf("show-b")).toBeDefined();
    expect(repository.shareOf("show-a")).toBeUndefined();
    expect(repository.slideshowByShareToken(TOKEN_A)).toBeUndefined();
  });

  it("deletes a slideshow's share link with the slideshow", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    repository.insertSlideshow(slideshow("show-b", 2000));
    repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
    repository.share("show-b", { token: TOKEN_B, createdAt: 5000 });
    repository.deleteSlideshow("show-a");
    expect(repository.slideshowByShareToken(TOKEN_B)).toBeDefined();
    expect(repository.slideshowByShareToken(TOKEN_A)).toBeUndefined();
    repository.insertSlideshow(slideshow("show-a", 1000));
    expect(repository.shareOf("show-a")).toBeUndefined();
  });

  it("undoes a share link made in a transaction that throws", () => {
    const repository = createRepository();
    repository.insertSlideshow(slideshow("show-a", 1000));
    expect(() =>
      repository.inTransaction(() => {
        repository.share("show-a", { token: TOKEN_A, createdAt: 5000 });
        throw new Error("work failed");
      }),
    ).toThrow("work failed");
    expect(repository.findSlideshow("show-a")).toBeDefined();
    expect(repository.shareOf("show-a")).toBeUndefined();
  });
}
