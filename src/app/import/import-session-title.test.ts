import { describe, expect, it } from "vitest";
import { pictureFile, sessionWith } from "./testing/import-session-fixtures";

async function sessionWithOnePicture() {
  const fixture = sessionWith();
  fixture.session.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
  await fixture.session.intake.settled();
  return fixture;
}

describe("ImportSession, the title of the slideshow it creates", () => {
  it("stores the given title", async () => {
    const { session, store } = await sessionWithOnePicture();

    const created = await session.create("en", "July 2025 · 2");

    expect(created.title).toBe("July 2025 · 2");
    expect((await store.listSlideshows()).map(({ title }) => title)).toEqual(["July 2025 · 2"]);
  });

  it("titles the slideshow with the capture month when no title is given", async () => {
    const { session } = await sessionWithOnePicture();

    expect((await session.create("en")).title).toBe("July 2025");
  });
});
