import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../picture-focus";
import { FakeFocusDetector } from "./fake-focus-detector";

const FACE: PictureFocus = { kind: "subject", box: { x: 0.25, y: 0.1, width: 0.2, height: 0.3 } };
const NONE: PictureFocus = { kind: "none" };

describe("FakeFocusDetector", () => {
  it("answers each thumbnail from the given function", async () => {
    const withFace = new Blob(["face"]);
    const detector = new FakeFocusDetector((blob) => (blob === withFace ? FACE : NONE));

    await expect(detector.detect(withFace)).resolves.toEqual(FACE);
    await expect(detector.detect(new Blob(["empty"]))).resolves.toEqual(NONE);
  });

  it("counts every detection asked for", async () => {
    const detector = new FakeFocusDetector(() => NONE);

    await detector.detect(new Blob());
    await detector.detect(new Blob());

    expect(detector.calls).toBe(2);
  });

  it("rejects when the answer function throws, like an undecodable thumbnail", async () => {
    const detector = new FakeFocusDetector(() => {
      throw new Error("cannot decode");
    });

    await expect(detector.detect(new Blob())).rejects.toThrow("cannot decode");
  });

  it("holds the next detection pending until the test releases it", async () => {
    const detector = new FakeFocusDetector(() => FACE);
    const hold = detector.holdNext();
    let settled: PictureFocus | undefined;

    const detection = detector.detect(new Blob()).then((focus) => (settled = focus));
    await Promise.resolve();
    expect(detector.calls).toBe(1);
    expect(settled).toBeUndefined();

    hold.release();
    await detection;
    expect(settled).toEqual(FACE);
  });

  it("holds only the next detection; later ones answer at once", async () => {
    const detector = new FakeFocusDetector(() => NONE);
    const hold = detector.holdNext();
    const held = detector.detect(new Blob());

    await expect(detector.detect(new Blob())).resolves.toEqual(NONE);

    hold.release();
    await expect(held).resolves.toEqual(NONE);
  });

  it("lets a held detection fail instead", async () => {
    const detector = new FakeFocusDetector(() => FACE);
    const hold = detector.holdNext();
    const held = detector.detect(new Blob());

    hold.fail(new Error("worker crashed"));

    await expect(held).rejects.toThrow("worker crashed");
  });
});
