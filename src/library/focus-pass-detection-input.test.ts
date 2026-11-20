import { describe, expect, it } from "vitest";
import { FocusDetectionFailedError, type FocusPassPorts } from "./focus-pass";
import type { DetectionInput } from "./focus-pass-types";
import type { PictureFocus } from "./picture-focus";
import { MediaNotFoundError } from "./library-store";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import { FACES, NOTHING, storeWith, passOver, storedFocus } from "./focus-pass-fixtures";

/** Wraps `store`, adding `detectionInput` so a test can swap what the pass detects on. */
function withDetectionInput(
  store: FocusPassPorts["store"],
  detectionInput: (pictureId: string) => Promise<DetectionInput>,
): FocusPassPorts["store"] {
  return {
    listSlideshows: () => store.listSlideshows(),
    pictureFocus: (ids) => store.pictureFocus(ids),
    thumbnailBlob: (id) => store.thumbnailBlob(id),
    putPictureFocus: (id, focus) => store.putPictureFocus(id, focus),
    detectionInput,
  };
}

function known(focus: PictureFocus): DetectionInput {
  return { kind: "known", focus };
}

class UndecodableInputError extends Error {}

describe("FocusPass, a store with a detectionInput port (ADR-0041)", () => {
  it("stores a focus the port answers as known, without running the detector", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const detector = new FakeFocusDetector(() => {
      throw new Error("the detector must not run when detectionInput answers a PictureFocus");
    });
    const input = withDetectionInput(store, () => Promise.resolve(known(FACES)));
    const { pass } = passOver(input, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(FACES)]]));
    expect(detector.calls).toBe(0);
  });

  it("runs the detector on a thumbnail the port answers", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const inputBlob = new Blob(["a preview"]);
    const detector = new FakeFocusDetector((blob) => {
      expect(blob).toBe(inputBlob);
      return NOTHING;
    });
    const input = withDetectionInput(store, () =>
      Promise.resolve({ kind: "detect", thumbnail: inputBlob }),
    );
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
      id === "a" ? Promise.reject(new MediaNotFoundError("a")) : Promise.resolve(known(NOTHING)),
    );
    const { pass } = passOver(input, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a", "b"])).toEqual(new Map([["b", storedFocus(NOTHING)]]));
  });

  it("marks a picture whose input cannot be decoded as failed and goes on to the next", async () => {
    const { store } = await storeWith({ "show-1": ["a", "b"] });
    const undecodable = new UndecodableInputError();
    const detector = new FakeFocusDetector(() => NOTHING);
    const input = withDetectionInput(store, (id) =>
      id === "a" ? Promise.reject(undecodable) : Promise.resolve(known(FACES)),
    );
    const { pass, logged, reported } = passOver(
      input,
      detector,
      undefined,
      undefined,
      (error) => error instanceof UndecodableInputError,
    );

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a", "b"])).toEqual(new Map([["b", storedFocus(FACES)]]));
    expect(pass.state.failed.has("a")).toBe(true);
    expect(logged).toEqual([expect.any(FocusDetectionFailedError)]);
    expect((logged[0] as FocusDetectionFailedError).pictureId).toBe("a");
    expect((logged[0] as FocusDetectionFailedError).cause).toBe(undecodable);
    expect(reported).toEqual([]);
  });

  it("ends the pass on an input error the failsPictureOn port does not accept", async () => {
    const { store } = await storeWith({ "show-1": ["a", "b"] });
    const input = withDetectionInput(store, () => Promise.reject(new UndecodableInputError()));
    const { pass, reported } = passOver(input, new FakeFocusDetector(() => NOTHING));

    pass.start();
    await pass.settled();

    expect(reported).toEqual([expect.any(UndecodableInputError)]);
    expect(pass.state.failed.size).toBe(0);
  });

  it("hands the detector the display the port answers beside a thumbnail (ADR-0061)", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const display = new Blob(["a preview"]);
    const detector = new FakeFocusDetector(() => NOTHING);
    const input = withDetectionInput(store, () =>
      Promise.resolve({ kind: "detect", thumbnail: new Blob(["small"]), display }),
    );
    const { pass } = passOver(input, detector);

    pass.start();
    await pass.settled();

    expect(detector.displays).toEqual([display]);
  });

  it("measures a known focus on the display the port answers beside it (ADR-0061)", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const display = new Blob(["a preview"]);
    const detector = new FakeFocusDetector(() => {
      throw new Error("a known focus is measured, never detected");
    });
    const input = withDetectionInput(store, () =>
      Promise.resolve({ kind: "known", focus: FACES, display }),
    );
    const { pass } = passOver(input, detector);

    pass.start();
    await pass.settled();

    expect(detector.measured).toEqual([{ display, focus: FACES }]);
    expect(await store.pictureFocus(["a"])).toEqual(
      new Map([["a", storedFocus({ ...FACES, sharpness: FakeFocusDetector.SHARPNESS })]]),
    );
  });

  it("marks a picture failed whose known focus cannot be measured, and goes on", async () => {
    const { store } = await storeWith({ "show-1": ["a", "b"] });
    const undecodable = new UndecodableInputError();
    const detector = new FakeFocusDetector(
      () => NOTHING,
      (display) => {
        if (display.size === 0) throw undecodable;
      },
    );
    const input = withDetectionInput(store, (id) =>
      Promise.resolve({ kind: "known", focus: FACES, display: new Blob([id === "a" ? "" : id]) }),
    );
    const { pass, logged, reported } = passOver(input, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a", "b"])).toEqual(
      new Map([["b", storedFocus({ ...FACES, sharpness: FakeFocusDetector.SHARPNESS })]]),
    );
    expect(pass.state.failed.has("a")).toBe(true);
    expect((logged[0] as FocusDetectionFailedError).cause).toBe(undecodable);
    expect(reported).toEqual([]);
  });
});
