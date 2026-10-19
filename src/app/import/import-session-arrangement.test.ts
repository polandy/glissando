import { describe, expect, it } from "vitest";
import { pictureFile, sessionWith } from "./testing/import-session-fixtures";

describe("ImportSession, arranging the pictures step's strip", () => {
  it("creates the slideshow in capture order, without ownOrder, as long as nothing was moved", async () => {
    const { session } = sessionWith();
    session.addPictures([
      pictureFile("late.jpg", "2025-08-02T10:00:00Z"),
      pictureFile("early.jpg", "2025-07-01T10:00:00Z"),
    ]);
    await session.intake.settled();

    const slideshow = await session.create("en");

    expect(slideshow.pictures.map((picture) => picture.fileName)).toEqual([
      "early.jpg",
      "late.jpg",
    ]);
    expect(slideshow.ownOrder).toBeUndefined();
  });

  it("creates the slideshow in the moved order and flags it as the user's own", async () => {
    const { session } = sessionWith();
    session.addPictures([
      pictureFile("late.jpg", "2025-08-02T10:00:00Z"),
      pictureFile("early.jpg", "2025-07-01T10:00:00Z"),
    ]);
    await session.intake.settled();
    const [early] = session.pictures.state.pictures;

    session.arrangement.moveGroup(new Set([early?.id ?? ""]), 2);
    const slideshow = await session.create("en");

    expect(slideshow.pictures.map((picture) => picture.fileName)).toEqual([
      "late.jpg",
      "early.jpg",
    ]);
    expect(slideshow.ownOrder).toBe(true);
  });
});
