import { describe, expect, it } from "vitest";
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

describe("FocusPass, storing what the detector finds", () => {
  it("stores what the detector finds for every picture of every slideshow", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a", "b"], "show-2": ["c"] });
    const detector = new FakeFocusDetector(
      answersBy(thumbnails, { a: FACES, b: NOTHING, c: FACES }),
    );
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a", "b", "c"])).toEqual(
      new Map([
        ["a", storedFocus(FACES)],
        ["b", storedFocus(NOTHING)],
        ["c", storedFocus(FACES)],
      ]),
    );
  });

  it("does not look again at a picture whose focus is stored, at the current detector version", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["looked-at", "new"] });
    await store.putPictureFocus("looked-at", storedFocus(NOTHING));
    const detector = new FakeFocusDetector(answersBy(thumbnails, { new: FACES }));
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect((await store.pictureFocus(["new"])).get("new")).toEqual(storedFocus(FACES));
    expect(detector.calls).toBe(1);
  });

  it("tells per slideshow how many of the pictures to look at are done, while it searches", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a", "b", "c"], "show-2": ["d"] });
    await store.putPictureFocus("c", storedFocus(NOTHING));
    const fake = new FakeFocusDetector(answersBy(thumbnails, { a: FACES, b: FACES, d: FACES }));
    const detector = new ObservedDetector(fake);
    const { pass } = passOver(store, detector);
    const progress: string[] = [];
    pass.subscribe((state) => {
      const shows = [...state.slideshows].map(([id, { done, total }]) => `${id} ${done}/${total}`);
      progress.push(`${state.running ? "running" : "idle"}: ${shows.join(", ")}`);
    });
    const held = fake.holdNext();

    pass.start();
    await detector.started(1);

    expect(pass.state.running).toBe(true);
    expect(pass.state.slideshows).toEqual(
      new Map([
        ["show-1", { done: 0, total: 2, again: false, failed: 0 }],
        ["show-2", { done: 0, total: 1, again: false, failed: 0 }],
      ]),
    );
    held.release();
    await pass.settled();
    expect(progress.some((line) => line.startsWith("running: show-1 1/2"))).toBe(true);
    expect(progress.at(-1)).toBe("idle: ");
    expect(pass.state.slideshows).toEqual(new Map());
  });

  it("marks a picture as searched for until its focus is found, then as found", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    const fake = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const detector = new ObservedDetector(fake);
    const { pass } = passOver(store, detector);
    const held = fake.holdNext();

    pass.start();
    await detector.started(1);

    expect(pass.state.searching.has("a")).toBe(true);
    expect(pass.state.found.has("a")).toBe(false);
    held.release();
    await pass.settled();
    expect(pass.state.found.get("a")).toEqual(FACES);
    expect(pass.state.searching.has("a")).toBe(false);
  });
});
