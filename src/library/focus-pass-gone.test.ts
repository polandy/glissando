import { describe, expect, it } from "vitest";
import type { FocusPassPorts } from "./focus-pass";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import { FACES, storeWith, answersBy, passOver, storedFocus } from "./focus-pass-fixtures";

describe("FocusPass, a slideshow gone between listing and reading its focus (ADR-0041)", () => {
  it("skips a slideshow deleted on another device between listing and reading its focus and looks at the others", async () => {
    const { store, thumbnails } = await storeWith({ "gone-show": ["a"], "show-1": ["b"] });
    const gone = new Error('slideshow "gone-show" not found');
    const flaky: FocusPassPorts["store"] = {
      listSlideshows: () => store.listSlideshows(),
      pictureFocus: (ids) => (ids.includes("a") ? Promise.reject(gone) : store.pictureFocus(ids)),
      thumbnailBlob: (id) => store.thumbnailBlob(id),
      putPictureFocus: (id, focus) => store.putPictureFocus(id, focus),
    };
    const detector = new FakeFocusDetector(answersBy(thumbnails, { b: FACES }));
    const { pass, logged, reported } = passOver(
      flaky,
      detector,
      undefined,
      (error) => error === gone,
    );

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["b"])).toEqual(new Map([["b", storedFocus(FACES)]]));
    expect(await store.pictureFocus(["a"])).toEqual(new Map());
    expect(reported).toEqual([]);
    expect(logged).toEqual([]);
  });

  it("ends the pass and reports a focus-read error isGone rejects", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const unexpected = new Error("a programming error");
    const flaky: FocusPassPorts["store"] = {
      listSlideshows: () => store.listSlideshows(),
      pictureFocus: () => Promise.reject(unexpected),
      thumbnailBlob: (id) => store.thumbnailBlob(id),
      putPictureFocus: (id, focus) => store.putPictureFocus(id, focus),
    };
    const { pass, logged, reported } = passOver(
      flaky,
      new FakeFocusDetector(() => FACES),
      undefined,
      () => false,
    );

    pass.start();
    await pass.settled();

    expect(reported).toEqual([unexpected]);
    expect(logged).toEqual([]);
  });
});
