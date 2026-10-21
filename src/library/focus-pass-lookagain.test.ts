import { describe, expect, it } from "vitest";
import { FOCUS_DETECTOR_VERSION } from "../focus/focus-detector-version";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import {
  FACES,
  NOTHING,
  storeWith,
  answersBy,
  ObservedDetector,
  passOver,
  storedFocus,
} from "./focus-pass-fixtures";

describe("FocusPass, outdated records (ADR-0041)", () => {
  it("looks again at a picture whose stored focus is outdated, not one at the current version", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["outdated", "current"] });
    await store.putPictureFocus("outdated", storedFocus(NOTHING, FOCUS_DETECTOR_VERSION - 1));
    await store.putPictureFocus("current", storedFocus(FACES));
    const detector = new FakeFocusDetector(answersBy(thumbnails, { outdated: FACES }));
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["outdated"])).toEqual(
      new Map([["outdated", storedFocus(FACES)]]),
    );
    expect(detector.calls).toBe(1);
  });
});

describe("FocusPass, lookAgain", () => {
  it("looks again at a picture regardless of its record, starting the pass on its own", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    await store.putPictureFocus("a", storedFocus(NOTHING));
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const { pass } = passOver(store, detector);

    pass.lookAgain(["a"]);
    await pass.settled();

    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(FACES)]]));
    expect(detector.calls).toBe(1);
  });

  it("brings a picture asked for by lookAgain to the front, ahead of the background scan", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a", "b", "c"] });
    const idOf = (blob: Blob): string =>
      [...thumbnails].find(([, candidate]) => candidate === blob)?.[0] ?? "?";
    const calls: string[] = [];
    const fake = new FakeFocusDetector((blob) => {
      calls.push(idOf(blob));
      return FACES;
    });
    const detector = new ObservedDetector(fake);
    const { pass } = passOver(store, detector);
    const held = fake.holdNext();

    pass.start();
    await detector.started(1); // "a" is in flight; the background queue still holds "b", "c".

    pass.lookAgain(["c"]);
    held.release();
    await pass.settled();

    expect(calls).toEqual(["a", "c", "b"]);
  });

  it("moves a picture already queued to the front instead of queuing it twice", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a", "b", "c"] });
    const idOf = (blob: Blob): string =>
      [...thumbnails].find(([, candidate]) => candidate === blob)?.[0] ?? "?";
    const calls: string[] = [];
    const fake = new FakeFocusDetector((blob) => {
      calls.push(idOf(blob));
      return FACES;
    });
    const detector = new ObservedDetector(fake);
    const { pass } = passOver(store, detector);
    const held = fake.holdNext();

    pass.start();
    await detector.started(1); // "a" is in flight; the background queue still holds "b", "c".

    pass.lookAgain(["c"]);
    pass.lookAgain(["c"]);
    held.release();
    await pass.settled();

    expect(calls).toEqual(["a", "c", "b"]);
    expect(fake.calls).toBe(3);
  });
});

describe("FocusPass, a slideshow's 'looking again'", () => {
  it("marks a slideshow as looking again only once every picture it takes up already had a record", async () => {
    const { store, thumbnails } = await storeWith({
      "all-again": ["x", "y"],
      mixed: ["known", "new"],
    });
    await store.putPictureFocus("x", storedFocus(NOTHING, FOCUS_DETECTOR_VERSION - 1));
    await store.putPictureFocus("y", storedFocus(NOTHING, FOCUS_DETECTOR_VERSION - 1));
    await store.putPictureFocus("known", storedFocus(NOTHING, FOCUS_DETECTOR_VERSION - 1));
    const fake = new FakeFocusDetector(
      answersBy(thumbnails, { x: FACES, y: FACES, known: FACES, new: FACES }),
    );
    const detector = new ObservedDetector(fake);
    const { pass } = passOver(store, detector);
    const held = fake.holdNext();

    pass.start();
    await detector.started(1);

    expect(pass.state.slideshows.get("all-again")?.again).toBe(true);
    expect(pass.state.slideshows.get("mixed")?.again).toBe(false);

    held.release();
    await pass.settled();
  });
});
