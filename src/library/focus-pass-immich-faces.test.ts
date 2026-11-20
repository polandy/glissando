import { describe, expect, it } from "vitest";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import type { PictureFocus } from "./picture-focus";
import { FACES, answersBy, passOver, storeWith, storedFocus } from "./focus-pass-fixtures";

const IMMICH_FACES: PictureFocus = {
  kind: "subject",
  box: { x: 0.4, y: 0.2, width: 0.2, height: 0.3 },
  foundBy: "immich-faces",
};

describe("FocusPass measures the sharpness of a focus Immich's faces gave (ADR-0061)", () => {
  it("measures it on the picture as shown, keeping the focus and not detecting", async () => {
    const { store, thumbnails, displays } = await storeWith({ "show-1": ["a"] });
    await store.putPictureFocus("a", storedFocus(IMMICH_FACES));
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(detector.calls).toBe(0);
    expect(detector.measured).toEqual([{ display: displays.get("a"), focus: IMMICH_FACES }]);
    expect(await store.pictureFocus(["a"])).toEqual(
      new Map([["a", storedFocus({ ...IMMICH_FACES, sharpness: FakeFocusDetector.SHARPNESS })]]),
    );
  });

  it("leaves a focus Immich's faces gave that is measured already alone", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    await store.putPictureFocus("a", storedFocus({ ...IMMICH_FACES, sharpness: 80 }));
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(detector.calls).toBe(0);
    expect(detector.measured).toEqual([]);
  });

  it("detects anew when asked to look again, replacing Immich's faces", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    await store.putPictureFocus("a", storedFocus(IMMICH_FACES));
    const detector = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const { pass } = passOver(store, detector);

    pass.lookAgain(["a"]);
    await pass.settled();

    expect(detector.measured).toEqual([]);
    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(FACES)]]));
  });
});
