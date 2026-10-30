import { describe, expect, it } from "vitest";
import type { FocusPassPorts } from "./focus-pass";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import { FACES, storeWith, answersBy, passOver, storedFocus } from "./focus-pass-fixtures";

/** Wraps `inner`, failing the named methods with `failure` while `failing()` is true. */
function flakyStore(
  inner: FocusPassPorts["store"],
  failure: Error,
  failing: () => boolean,
  {
    onList = false,
    onFocusRead = false,
    onThumbnail = false,
    onStore = false,
  }: { onList?: boolean; onFocusRead?: boolean; onThumbnail?: boolean; onStore?: boolean },
): FocusPassPorts["store"] {
  return {
    listSlideshows: () => (onList && failing() ? Promise.reject(failure) : inner.listSlideshows()),
    pictureFocus: (ids) =>
      onFocusRead && failing() ? Promise.reject(failure) : inner.pictureFocus(ids),
    thumbnailBlob: (id) =>
      onThumbnail && failing() ? Promise.reject(failure) : inner.thumbnailBlob(id),
    putPictureFocus: (id, focus) =>
      onStore && failing() ? Promise.reject(failure) : inner.putPictureFocus(id, focus),
  };
}

describe("FocusPass, pausing on a pausesOn error (ADR-0041)", () => {
  it("pauses quietly when reading a thumbnail fails, leaves the rest queued, and resumes later", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a", "b"] });
    const unreachable = new Error("the server is unreachable");
    let unreachableNow = true;
    const flaky = flakyStore(store, unreachable, () => unreachableNow, { onThumbnail: true });
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES, b: FACES }));
    const { pass, logged, reported } = passOver(flaky, detector, (error) => error === unreachable);

    pass.start();
    await pass.settled();

    expect(pass.state.paused).toBe(true);
    expect(pass.state.running).toBe(false);
    expect(logged).toEqual([unreachable]);
    expect(reported).toEqual([]);
    expect(detector.calls).toBe(0);
    expect(await store.pictureFocus(["a", "b"])).toEqual(new Map());

    unreachableNow = false;
    pass.start();
    await pass.settled();

    expect(pass.state.paused).toBe(false);
    expect(await store.pictureFocus(["a", "b"])).toEqual(
      new Map([
        ["a", storedFocus(FACES)],
        ["b", storedFocus(FACES)],
      ]),
    );
  });

  it("pauses quietly when storing a result fails, and resumes to store it later", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    const unreachable = new Error("the server is unreachable");
    let unreachableNow = true;
    const flaky = flakyStore(store, unreachable, () => unreachableNow, { onStore: true });
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const { pass, logged, reported } = passOver(flaky, detector, (error) => error === unreachable);

    pass.start();
    await pass.settled();

    expect(pass.state.paused).toBe(true);
    expect(logged).toEqual([unreachable]);
    expect(reported).toEqual([]);
    expect(await store.pictureFocus(["a"])).toEqual(new Map());

    unreachableNow = false;
    pass.start();
    await pass.settled();

    expect(pass.state.paused).toBe(false);
    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(FACES)]]));
  });

  it("resumes from a pause through lookAgain as well as start", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    const unreachable = new Error("the server is unreachable");
    let unreachableNow = true;
    const flaky = flakyStore(store, unreachable, () => unreachableNow, { onThumbnail: true });
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const { pass } = passOver(flaky, detector, (error) => error === unreachable);

    pass.start();
    await pass.settled();
    expect(pass.state.paused).toBe(true);

    unreachableNow = false;
    pass.lookAgain(["a"]);
    await pass.settled();

    expect(pass.state.paused).toBe(false);
    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(FACES)]]));
  });

  it("pauses quietly when listing slideshows fails during a scan, and resumes the scan later", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    const unreachable = new Error("the server is unreachable");
    let unreachableNow = true;
    const flaky = flakyStore(store, unreachable, () => unreachableNow, { onList: true });
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const { pass, logged, reported } = passOver(flaky, detector, (error) => error === unreachable);

    pass.start();
    await pass.settled();

    expect(pass.state.paused).toBe(true);
    expect(logged).toEqual([unreachable]);
    expect(reported).toEqual([]);
    expect(detector.calls).toBe(0);

    unreachableNow = false;
    pass.start();
    await pass.settled();

    expect(pass.state.paused).toBe(false);
    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(FACES)]]));
  });

  it("pauses quietly when reading stored focus fails for a lookAgain request, and resumes it later", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    const unreachable = new Error("the server is unreachable");
    let unreachableNow = true;
    const flaky = flakyStore(store, unreachable, () => unreachableNow, { onFocusRead: true });
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const { pass, logged, reported } = passOver(flaky, detector, (error) => error === unreachable);

    pass.lookAgain(["a"]);
    await pass.settled();

    expect(pass.state.paused).toBe(true);
    expect(logged).toEqual([unreachable]);
    expect(reported).toEqual([]);
    expect(detector.calls).toBe(0);

    unreachableNow = false;
    pass.lookAgain(["a"]);
    await pass.settled();

    expect(pass.state.paused).toBe(false);
    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(FACES)]]));
  });

  it("does not pause on an error pausesOn rejects: the pass ends and reports it", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    const unexpected = new Error("a programming error");
    const flaky = flakyStore(store, unexpected, () => true, { onThumbnail: true });
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const { pass, logged, reported } = passOver(flaky, detector, () => false);

    pass.start();
    await pass.settled();

    expect(pass.state.paused).toBe(false);
    expect(reported).toEqual([unexpected]);
    expect(logged).toEqual([]);
  });
});
