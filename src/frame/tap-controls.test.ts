import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../ui-kit/testing/fake-scheduler";
import { CONTROLS_VISIBLE_MS, TapControls } from "./tap-controls";

function setUp() {
  const scheduler = new FakeScheduler();
  return { scheduler, controls: new TapControls(scheduler) };
}

describe("TapControls", () => {
  it("starts hidden", () => {
    const { controls } = setUp();

    expect(controls.visible).toBe(false);
  });

  it("shows the controls on a tap", () => {
    const { controls } = setUp();

    controls.tap();

    expect(controls.visible).toBe(true);
  });

  it("hides the controls on their own after 4 seconds", () => {
    const { scheduler, controls } = setUp();
    controls.tap();

    scheduler.advance(CONTROLS_VISIBLE_MS - 1);
    expect(controls.visible).toBe(true);
    scheduler.advance(1);
    expect(controls.visible).toBe(false);
    expect(CONTROLS_VISIBLE_MS).toBe(4000);
  });

  it("uses an injected visible duration instead of the default, so an e2e case can keep the controls up", () => {
    const scheduler = new FakeScheduler();
    const controls = new TapControls(scheduler, 60_000);
    controls.tap();

    scheduler.advance(CONTROLS_VISIBLE_MS);
    expect(controls.visible).toBe(true);
    scheduler.advance(60_000 - CONTROLS_VISIBLE_MS);
    expect(controls.visible).toBe(false);
  });

  it("hides on a second tap instead of waiting out the timer", () => {
    const { controls } = setUp();
    controls.tap();

    controls.tap();

    expect(controls.visible).toBe(false);
  });

  it("gives a tap while shown a fresh 4 seconds, not the time already elapsed", () => {
    const { scheduler, controls } = setUp();
    controls.tap();
    scheduler.advance(CONTROLS_VISIBLE_MS - 1);

    controls.tap(); // hides
    controls.tap(); // shows again, fresh timer

    scheduler.advance(CONTROLS_VISIBLE_MS - 1);
    expect(controls.visible).toBe(true);
    scheduler.advance(1);
    expect(controls.visible).toBe(false);
  });

  it("tells subscribers of every change", () => {
    const { controls } = setUp();
    const seen: boolean[] = [];
    controls.subscribe((visible) => seen.push(visible));

    controls.tap();
    controls.hide();

    expect(seen).toEqual([true, false]);
  });

  it("does nothing when hidden and told to hide again", () => {
    const { controls } = setUp();
    const seen: boolean[] = [];
    controls.subscribe((visible) => seen.push(visible));

    controls.hide();

    expect(seen).toEqual([]);
  });
});
