import { describe, expect, it } from "vitest";
import { readServerDocument, serverDocumentFor, storedSlideshowFrom } from "./server-document";
import { slideshow } from "./server-document-fixtures";

describe("the slideshow's mood in the server document", () => {
  it("carries a slideshow's mood so it travels to the server", () => {
    const written = serverDocumentFor({ ...slideshow, mood: "calm" });
    expect(written.slideshow.mood).toBe("calm");
    expect(serverDocumentFor(slideshow).slideshow).not.toHaveProperty("mood");
  });

  it("reads a mood back as written", () => {
    const written = serverDocumentFor({ ...slideshow, mood: "lively" });
    expect(readServerDocument(JSON.parse(JSON.stringify(written)))).toEqual(written);
  });

  it("gives the stored slideshow back its mood", () => {
    const written = serverDocumentFor({ ...slideshow, mood: "calm" });
    expect(storedSlideshowFrom("server-show-1", written).mood).toBe("calm");
  });
});
