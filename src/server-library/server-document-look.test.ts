import { describe, expect, it } from "vitest";
import { readServerDocument, serverDocumentFor, storedSlideshowFrom } from "./server-document";
import { slideshow } from "./server-document-fixtures";

describe("the slideshow's colour grade in the server document", () => {
  it("carries a slideshow's look so the grade travels to the server", () => {
    const written = serverDocumentFor({ ...slideshow, look: "warm" });
    expect(written.slideshow.look).toBe("warm");
    expect(serverDocumentFor(slideshow).slideshow).not.toHaveProperty("look");
  });

  it("reads a look back as written", () => {
    const written = serverDocumentFor({ ...slideshow, look: "warm" });
    expect(readServerDocument(JSON.parse(JSON.stringify(written)))).toEqual(written);
  });

  it("gives the stored slideshow back its look", () => {
    const written = serverDocumentFor({ ...slideshow, look: "warm" });
    expect(storedSlideshowFrom("server-show-1", written).look).toBe("warm");
  });
});
