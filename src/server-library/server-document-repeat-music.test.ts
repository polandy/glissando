import { describe, expect, it } from "vitest";
import { readServerDocument, serverDocumentFor, storedSlideshowFrom } from "./server-document";
import { slideshow } from "./server-document-fixtures";

describe("the slideshow's music repeat in the server document (ADR-0047)", () => {
  it("carries a slideshow's music repeat so it travels to the server", () => {
    const written = serverDocumentFor({ ...slideshow, repeatMusic: true });
    expect(written.slideshow.repeatMusic).toBe(true);
    expect(serverDocumentFor(slideshow).slideshow).not.toHaveProperty("repeatMusic");
  });

  it("reads music repeat back as written", () => {
    const written = serverDocumentFor({ ...slideshow, repeatMusic: true });
    expect(readServerDocument(JSON.parse(JSON.stringify(written)))).toEqual(written);
  });

  it("gives the stored slideshow back its music repeat", () => {
    const written = serverDocumentFor({ ...slideshow, repeatMusic: true });
    expect(storedSlideshowFrom("server-show-1", written).repeatMusic).toBe(true);
  });
});
