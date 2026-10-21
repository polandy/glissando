import { describe, expect, it } from "vitest";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import { picture, slideshow } from "./testing/library-store-contract";
import { FACES, thumbnail, passOver, WriteRecordingStore } from "./focus-pass-fixtures";

const OWN_MOTION = {
  from: { zoom: 2, centerX: 0.4, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
};

/** A store with one slideshow, one picture with its own Ken Burns motion; no writes recorded yet. */
async function storeWithOwnMotion(): Promise<WriteRecordingStore> {
  const store = new WriteRecordingStore();
  const blob = thumbnail("a");
  await store.putPicture("a", { display: blob, thumbnail: blob });
  await store.saveSlideshow(
    slideshow({ id: "show-1", pictures: [{ ...picture("a"), kenBurns: OWN_MOTION }] }),
  );
  store.writes.length = 0;
  return store;
}

describe("FocusPass, what it writes (ADR-0041)", () => {
  it("writes only the focus it found, leaving a picture's own motion untouched", async () => {
    const store = await storeWithOwnMotion();
    const detector = new FakeFocusDetector(() => FACES);
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(store.writes[0]).toBe("putPictureFocus");
    expect(store.writes).toEqual(["putPictureFocus"]);
    expect((await store.getSlideshow("show-1")).pictures[0]?.kenBurns).toEqual(OWN_MOTION);
  });

  it("writes only the focus it found when asked again through lookAgain, leaving the motion untouched", async () => {
    const store = await storeWithOwnMotion();
    const detector = new FakeFocusDetector(() => FACES);
    const { pass } = passOver(store, detector);

    pass.lookAgain(["a"]);
    await pass.settled();

    expect(store.writes).toEqual(["putPictureFocus"]);
    expect((await store.getSlideshow("show-1")).pictures[0]?.kenBurns).toEqual(OWN_MOTION);
  });
});
