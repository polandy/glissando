import { describe, expect, it } from "vitest";
import { readServerDocument, serverDocumentFor, storedSlideshowFrom } from "./server-document";
import { slideshow } from "./server-document-fixtures";

describe("the slideshow's energy pacing in the server document", () => {
  it("carries a slideshow's energy pacing so it travels to the server", () => {
    const written = serverDocumentFor({ ...slideshow, energyPacing: true });
    expect(written.slideshow.energyPacing).toBe(true);
    expect(serverDocumentFor(slideshow).slideshow).not.toHaveProperty("energyPacing");
  });

  it("reads energy pacing back as written", () => {
    const written = serverDocumentFor({ ...slideshow, energyPacing: true });
    expect(readServerDocument(JSON.parse(JSON.stringify(written)))).toEqual(written);
  });

  it("gives the stored slideshow back its energy pacing", () => {
    const written = serverDocumentFor({ ...slideshow, energyPacing: true });
    expect(storedSlideshowFrom("server-show-1", written).energyPacing).toBe(true);
  });
});
