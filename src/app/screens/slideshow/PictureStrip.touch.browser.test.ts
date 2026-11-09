import { afterEach, describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import { endTouchInput, RealFinger } from "../../testing/touch-input";
import { dragFirstToTenth, mountRig, type StripRig } from "./strip-drag-rig";

/** Genuine touch input exists only through Chromium's DevTools protocol. */
const canTouch = server.browser === "chromium";

let rig: StripRig | null = null;
afterEach(async () => {
  rig?.destroy();
  rig = null;
  if (canTouch) await endTouchInput();
});

describe.skipIf(!canTouch)("PictureStrip: hold and drag with a real finger (Chromium)", () => {
  it("drops picture 1 after picture 10 with no native pan and no cancelled pointer", async () => {
    rig = await mountRig();
    const finger = new RealFinger();

    const report = await dragFirstToTenth(finger, rig);

    expect(rig.moves).toEqual([[["p1"], 10]]);
    // The browser did not pan the page under the finger: only the auto-scroll moved it.
    expect(report.scrollBeforeFrames).toBe(0);
    expect(report.scrollAtTarget).toBeGreaterThan(0);
    expect(rig.cancels).toEqual([]);
  });

  it("sends no click to a tile after the drop, only to the next tap", async () => {
    rig = await mountRig();
    const finger = new RealFinger();
    await dragFirstToTenth(finger, rig);
    expect(rig.moves).toHaveLength(1);
    const box = rig.tile(3).getBoundingClientRect();

    const selected = rig.nextSelection();
    await finger.down(box.left + box.width / 2, box.top + box.height / 2);
    await finger.up();

    expect([...(await selected).ids]).toEqual(["p3"]);
    expect(
      rig.clicks.map((click) =>
        (click.target as HTMLElement).closest(".pick")?.getAttribute("data-picture-id"),
      ),
    ).toEqual(["p3"]);
  });
});
