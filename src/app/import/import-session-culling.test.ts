import { describe, expect, it } from "vitest";
import { FakePictureChecker } from "../../culling/testing/fake-picture-checker";
import { MediaNotFoundError } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { CREATED_AT, pictureFile, sessionWith } from "./testing/import-session-fixtures";

const SCENE = 0x0f0f_0f0f_0f0f_0f0fn;
/** A burst of two, b the sharper. */
const burstChecker = () =>
  new FakePictureChecker({
    "thumbnail a.jpg": { sharpness: 200, hash: SCENE },
    "thumbnail b.jpg": { sharpness: 400, hash: SCENE },
  });
const burst = () => [
  pictureFile("a.jpg", "2025-07-02T14:02:10Z"),
  pictureFile("b.jpg", "2025-07-02T14:02:11Z"),
];

describe("ImportSession, culling", () => {
  it("refuses to create the slideshow while pictures are still being checked", async () => {
    const checker = burstChecker();
    checker.hold();
    const { session } = sessionWith(new MemoryLibraryStore(), { checker });
    session.addPictures(burst());
    await session.pictures.settled();

    await expect(session.create("en")).rejects.toThrow(/checked/);
  });

  it("creates the slideshow without the set-aside pictures, whose media the clean-up then deletes", async () => {
    const { session, store } = sessionWith(new MemoryLibraryStore(), { checker: burstChecker() });
    session.addPictures(burst());
    await session.intake.settled();
    const setAside = session.intake.culling.state.groups[0]?.pictures[0];

    const slideshow = await session.create("en");
    await store.deleteUnreferencedMedia(CREATED_AT);

    expect(slideshow.pictures.map(({ fileName }) => fileName)).toEqual(["b.jpg"]);
    expect(setAside?.fileName).toBe("a.jpg");
    expect(
      await store.pictureBlob(setAside?.id ?? "").catch((error: unknown) => error),
    ).toBeInstanceOf(MediaNotFoundError);
  });
});
