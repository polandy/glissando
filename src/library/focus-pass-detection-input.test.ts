import { describe, expect, it } from "vitest";
import type { FocusPassPorts } from "./focus-pass";
import type { PictureFocus } from "./picture-focus";
import { MediaNotFoundError } from "./library-store";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import { FACES, NOTHING, storeWith, passOver, storedFocus } from "./focus-pass-fixtures";

/** Wraps `store`, adding `detectionInput` so a test can swap what the pass detects on. */
function withDetectionInput(
  store: FocusPassPorts["store"],
  detectionInput: (pictureId: string) => Promise<PictureFocus | Blob>,
): FocusPassPorts["store"] {
  return {
    listSlideshows: () => store.listSlideshows(),
    pictureFocus: (ids) => store.pictureFocus(ids),
    thumbnailBlob: (id) => store.thumbnailBlob(id),
    putPictureFocus: (id, focus) => store.putPictureFocus(id, focus),
    detectionInput,
  };
}

describe("FocusPass, a store with a detectionInput port (ADR-0041)", () => {
  it("stores a PictureFocus the port answers directly, without running the detector", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const detector = new FakeFocusDetector(() => {
      throw new Error("the detector must not run when detectionInput answers a PictureFocus");
    });
    const input = withDetectionInput(store, () => Promise.resolve(FACES));
    const { pass } = passOver(input, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(FACES)]]));
    expect(detector.calls).toBe(0);
  });

  it("runs the detector on a Blob the port answers, same as a thumbnail", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const inputBlob = new Blob(["a preview"]);
    const detector = new FakeFocusDetector((blob) => {
      expect(blob).toBe(inputBlob);
      return NOTHING;
    });
    const input = withDetectionInput(store, () => Promise.resolve(inputBlob));
    const { pass } = passOver(input, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(NOTHING)]]));
    expect(detector.calls).toBe(1);
  });

  it("skips a picture whose detectionInput reports its media gone", async () => {
    const { store } = await storeWith({ "show-1": ["a", "b"] });
    const detector = new FakeFocusDetector(() => NOTHING);
    const input = withDetectionInput(store, (id) =>
      id === "a" ? Promise.reject(new MediaNotFoundError("a")) : Promise.resolve(NOTHING),
    );
    const { pass } = passOver(input, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a", "b"])).toEqual(new Map([["b", storedFocus(NOTHING)]]));
  });
});
