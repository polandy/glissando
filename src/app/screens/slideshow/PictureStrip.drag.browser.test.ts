import { afterEach, describe, expect, it } from "vitest";
import { dragFirstToTenth, mountRig, type Finger, type StripRig } from "./strip-drag-rig";

let rig: StripRig | null = null;
afterEach(() => {
  rig?.destroy();
  rig = null;
});

const POINTER_ID = 1;
/** The smallest touch target, in CSS px. */
const MIN_TOUCH_TARGET_PX = 44;

/** A finger made of synthetic touch pointer events, the same in every engine. */
class SyntheticFinger implements Finger {
  async down(x: number, y: number): Promise<void> {
    this.#fire("pointerdown", x, y);
  }
  async move(x: number, y: number): Promise<void> {
    this.#fire("pointermove", x, y);
  }
  async up(): Promise<void> {
    this.#fire("pointerup", this.#x, this.#y);
  }
  #x = 0;
  #y = 0;
  #fire(type: string, x: number, y: number): void {
    this.#x = x;
    this.#y = y;
    const target = document.elementFromPoint(x, y) ?? document.body;
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: POINTER_ID,
        pointerType: "touch",
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
      }),
    );
  }
}

describe("PictureStrip: hold and drag with touch pointers", () => {
  it("drops picture 1 after picture 10, which only auto-scroll brought on screen", async () => {
    rig = await mountRig();
    expect(rig.tile(10).getBoundingClientRect().top).toBeGreaterThan(window.innerHeight);

    const report = await dragFirstToTenth(new SyntheticFinger(), rig);

    expect(rig.moves).toEqual([[["p1"], 10]]);
    expect(report.scrollBeforeFrames).toBe(0);
    expect(report.scrollAtTarget).toBeGreaterThan(0);
    expect(rig.cancels).toEqual([]);
    expect(rig.selections).toEqual([]);
  });

  it("moves nothing when the finger lets go before the hold has lifted the tile", async () => {
    rig = await mountRig();
    const finger = new SyntheticFinger();
    const box = rig.tile(1).getBoundingClientRect();

    await finger.down(box.left + 5, box.top + 5);
    await finger.up();
    rig.holdScheduler.advance(10_000);

    expect(rig.holdScheduler.pending).toBe(0);
    expect(rig.moves).toEqual([]);
  });

  it("gives every tile a touch target of at least 44 px on a phone", async () => {
    rig = await mountRig();

    for (let number = 1; number <= 14; number += 1) {
      const box = rig.tile(number).getBoundingClientRect();
      expect(box.width, `tile ${number} width`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
      expect(box.height, `tile ${number} height`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
    }
  });
});
