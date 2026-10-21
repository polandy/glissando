import { describe, expect, it } from "vitest";
import { FocusDetectionFailedError } from "./focus-pass";
import { FocusDetectorGoneError } from "./focus-detector";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import { FACES, NOTHING, storeWith, answersBy, passOver, storedFocus } from "./focus-pass-fixtures";

describe("FocusPass, a failing detection", () => {
  it("logs a failed detection, stores nothing for that picture and carries on", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["broken", "fine"] });
    const detector = new FakeFocusDetector(answersBy(thumbnails, { fine: FACES }));
    const { pass, logged, reported } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect((await store.pictureFocus(["fine"])).get("fine")).toEqual(storedFocus(FACES));
    expect((await store.pictureFocus(["broken"])).has("broken")).toBe(false);
    expect(logged).toEqual([expect.any(FocusDetectionFailedError)]);
    expect((logged[0] as FocusDetectionFailedError).pictureId).toBe("broken");
    expect(reported).toEqual([]);
    expect(pass.state.failed.has("broken")).toBe(true);
  });

  it("stops at the first detection the gone detector fails, reports it once and leaves the rest for the next pass", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["first", "second", "third"] });
    let detectorGone = true;
    const answer = answersBy(thumbnails, { first: FACES, second: FACES, third: NOTHING });
    const detector = new FakeFocusDetector((blob) => {
      if (detectorGone) {
        throw new FocusDetectorGoneError("the focus worker crashed");
      }
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(reported).toEqual([expect.any(FocusDetectorGoneError)]);
    expect(detector.calls).toBe(1);
    expect(logged).toEqual([]);
    expect(pass.state).toMatchObject({
      running: false,
      slideshows: new Map(),
      searching: new Set(),
    });

    detectorGone = false;
    pass.start();
    await pass.settled();

    expect((await store.pictureFocus(["first", "second", "third"])).size).toBe(3);
  });

  it("looks again at a picture whose detection failed on the next pass", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["flaky"] });
    let detectorWorks = false;
    const answer = answersBy(thumbnails, { flaky: FACES });
    const detector = new FakeFocusDetector((blob) => {
      if (!detectorWorks) {
        throw new Error("the worker failed");
      }
      return answer(blob);
    });
    const { pass } = passOver(store, detector);
    pass.start();
    await pass.settled();
    expect((await store.pictureFocus(["flaky"])).has("flaky")).toBe(false);
    expect(pass.state.failed.has("flaky")).toBe(true);

    detectorWorks = true;
    pass.start();
    await pass.settled();

    expect((await store.pictureFocus(["flaky"])).get("flaky")).toEqual(storedFocus(FACES));
    expect(pass.state.failed.has("flaky")).toBe(false);
  });
});
