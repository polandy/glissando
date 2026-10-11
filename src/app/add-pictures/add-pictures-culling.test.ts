import { describe, expect, it } from "vitest";
import { FakePictureChecker } from "../../culling/testing/fake-picture-checker";
import { picture, slideshow } from "../../library/testing/library-store-contract";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { fakeIntakePorts, pictureFile } from "../testing/picture-intake-ports";
import { AddPicturesSession } from "./add-pictures-session";

const SCENE = 0x0f0f_0f0f_0f0f_0f0fn;
const SHOW = slideshow({
  pictures: [{ ...picture("old"), fileName: "old.jpg", capturedAt: "2025-07-02T14:02:09Z" }],
});

async function sessionWithBurstChecker() {
  const store = new MemoryLibraryStore();
  await store.saveSlideshow(SHOW);
  const checker = new FakePictureChecker({
    "thumbnail a.jpg": { sharpness: 200, hash: SCENE },
    "thumbnail b.jpg": { sharpness: 400, hash: SCENE },
  });
  const { ports } = fakeIntakePorts(store, { checker });
  return { session: new AddPicturesSession(SHOW, "device", { ...ports, store }), checker, store };
}

const burst = () => [
  pictureFile("a.jpg", "2025-07-02T14:02:10Z"),
  pictureFile("b.jpg", "2025-07-02T14:02:11Z"),
];

describe("AddPicturesSession, culling", () => {
  it("refuses to add while the new pictures are still being checked", async () => {
    const { session, checker } = await sessionWithBurstChecker();
    checker.hold();
    session.addPictures(burst());
    await session.intake.pictures.settled();

    await expect(session.commit()).rejects.toThrow(/checked/);
  });

  it("adds the new pictures without the set-aside ones, bursts found among the new pictures only", async () => {
    const { session, store } = await sessionWithBurstChecker();
    session.addPictures(burst());
    await session.intake.settled();

    await session.commit();

    const stored = await store.getSlideshow(SHOW.id);
    expect(stored.pictures.map(({ fileName }) => fileName)).toEqual(["old.jpg", "b.jpg"]);
  });
});
