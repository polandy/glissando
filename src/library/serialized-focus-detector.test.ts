import { describe, expect, it } from "vitest";
import type { FocusDetector } from "./focus-detector";
import { FACES, NOTHING } from "./focus-pass-fixtures";
import type { PictureFocus } from "./picture-focus";
import { serializeFocusDetector } from "./serialized-focus-detector";

const BLOB_A = new Blob(["a"]);
const BLOB_B = new Blob(["b"]);
const BLOB_C = new Blob(["c"]);

/** Detects nothing on its own: each call waits for `settleNext`/`failNext`, in call order. */
class ManualFocusDetector implements FocusDetector {
  readonly order: Blob[] = [];
  readonly #pending: {
    resolve(focus: PictureFocus): void;
    reject(error: unknown): void;
  }[] = [];

  detect(thumbnail: Blob): Promise<PictureFocus> {
    return this.#wait(thumbnail);
  }

  measure(display: Blob): Promise<PictureFocus> {
    return this.#wait(display);
  }

  #wait(blob: Blob): Promise<PictureFocus> {
    this.order.push(blob);
    const { promise, resolve, reject } = Promise.withResolvers<PictureFocus>();
    this.#pending.push({ resolve, reject });
    return promise;
  }

  settleNext(focus: PictureFocus): void {
    this.#next().resolve(focus);
  }

  failNext(error: unknown): void {
    this.#next().reject(error);
  }

  #next() {
    const next = this.#pending.shift();
    if (next === undefined) throw new Error("no detection to settle");
    return next;
  }
}

describe("serializeFocusDetector", () => {
  it.each(["primary", "secondary"] as const)(
    "hands the %s side's display rendition on to the detector",
    async (side) => {
      const displays: Array<Blob | undefined> = [];
      const inner: FocusDetector = {
        detect: (_thumbnail, display) => {
          displays.push(display);
          return Promise.resolve(NOTHING);
        },
        measure: () => Promise.reject(new Error("only detections are asked for here")),
      };

      await serializeFocusDetector(inner)[side].detect(BLOB_A, BLOB_B);

      expect(displays).toHaveLength(1);
      expect(displays[0]).toBe(BLOB_B);
    },
  );

  it("never lets the primary and secondary sides detect at the same time", async () => {
    const inner = new ManualFocusDetector();
    const { primary, secondary } = serializeFocusDetector(inner);

    const first = primary.detect(BLOB_A);
    const second = secondary.detect(BLOB_B);
    expect(inner.order).toEqual([BLOB_A]);

    inner.settleNext(FACES);
    await first;
    expect(inner.order).toEqual([BLOB_A, BLOB_B]);

    inner.settleNext(NOTHING);
    expect(await second).toEqual(NOTHING);
  });

  it("queues a measurement behind a running detection, as another detection", async () => {
    const inner = new ManualFocusDetector();
    const { primary, secondary } = serializeFocusDetector(inner);

    const detecting = primary.detect(BLOB_A);
    const measuring = secondary.measure(BLOB_B, FACES);
    expect(inner.order).toEqual([BLOB_A]);

    inner.settleNext(NOTHING);
    await detecting;
    expect(inner.order).toEqual([BLOB_A, BLOB_B]);

    inner.settleNext(FACES);
    expect(await measuring).toEqual(FACES);
  });

  it("gives the primary side priority over a secondary call already waiting its turn", async () => {
    const inner = new ManualFocusDetector();
    const { primary, secondary } = serializeFocusDetector(inner);

    const running = primary.detect(BLOB_A);
    const waitingSecondary = secondary.detect(BLOB_B);
    const laterPrimary = primary.detect(BLOB_C);

    inner.settleNext(FACES);
    await running;
    expect(inner.order).toEqual([BLOB_A, BLOB_C]);

    inner.settleNext(FACES);
    await laterPrimary;
    expect(inner.order).toEqual([BLOB_A, BLOB_C, BLOB_B]);

    inner.settleNext(NOTHING);
    await waitingSecondary;
  });

  it("lets a secondary call through at once when nothing primary is running or waiting", async () => {
    const inner = new ManualFocusDetector();
    const { secondary } = serializeFocusDetector(inner);

    const detecting = secondary.detect(BLOB_A);
    inner.settleNext(FACES);

    expect(await detecting).toEqual(FACES);
    expect(inner.order).toEqual([BLOB_A]);
  });

  it("rejects with the shared detector's own error", async () => {
    const inner = new ManualFocusDetector();
    const { primary } = serializeFocusDetector(inner);
    const error = new Error("the worker crashed");

    const detecting = primary.detect(BLOB_A);
    inner.failNext(error);

    await expect(detecting).rejects.toBe(error);
  });
});
