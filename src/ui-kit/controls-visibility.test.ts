import { describe, expect, it } from "vitest";
import { FakeScheduler } from "./testing/fake-scheduler";
import { CONTROLS_HIDE_DELAY_MS, ControlsVisibility } from "./controls-visibility";

function setUp() {
  const scheduler = new FakeScheduler();
  const changes: boolean[] = [];
  const controls = new ControlsVisibility(scheduler, (visible) => changes.push(visible));
  return { scheduler, controls, changes };
}

const LONG_PAUSE_MS = 60_000;

describe("player controls visibility", () => {
  it("shows the controls when the player opens", () => {
    expect(setUp().controls.visible).toBe(true);
  });

  it("hides the controls 2.5 s after playback starts", () => {
    const { scheduler, controls, changes } = setUp();
    controls.setPlaying(true);

    scheduler.advance(CONTROLS_HIDE_DELAY_MS - 1);
    expect(controls.visible).toBe(true);
    scheduler.advance(1);
    expect(controls.visible).toBe(false);
    expect(changes).toEqual([false]);
    expect(CONTROLS_HIDE_DELAY_MS).toBe(2500);
  });

  it("repeated setPlaying(true) does not restart the hide delay", () => {
    const { scheduler, controls } = setUp();
    controls.setPlaying(true);

    scheduler.advance(CONTROLS_HIDE_DELAY_MS - 1);
    controls.setPlaying(true);
    scheduler.advance(1);

    expect(controls.visible).toBe(false);
  });

  it("keeps the controls while paused", () => {
    const { scheduler, controls } = setUp();
    controls.setPlaying(false);

    scheduler.advance(LONG_PAUSE_MS);

    expect(controls.visible).toBe(true);
    expect(scheduler.pending).toBe(0);
  });

  it("shows the controls again on pause and keeps them", () => {
    const { scheduler, controls } = setUp();
    controls.setPlaying(true);
    scheduler.advance(CONTROLS_HIDE_DELAY_MS);

    controls.setPlaying(false);
    scheduler.advance(LONG_PAUSE_MS);

    expect(controls.visible).toBe(true);
  });

  it("toggles the controls on a tap", () => {
    const { controls } = setUp();

    controls.toggle();
    expect(controls.visible).toBe(false);
    controls.toggle();
    expect(controls.visible).toBe(true);
  });

  it("hides controls a tap showed during playback after 2.5 s", () => {
    const { scheduler, controls } = setUp();
    controls.setPlaying(true);
    scheduler.advance(CONTROLS_HIDE_DELAY_MS);

    controls.toggle();
    scheduler.advance(CONTROLS_HIDE_DELAY_MS - 1);
    expect(controls.visible).toBe(true);
    scheduler.advance(1);
    expect(controls.visible).toBe(false);
  });

  it("restarts the delay on every interaction", () => {
    const { scheduler, controls } = setUp();
    controls.setPlaying(true);
    scheduler.advance(CONTROLS_HIDE_DELAY_MS - 1);

    controls.reveal();
    scheduler.advance(CONTROLS_HIDE_DELAY_MS - 1);

    expect(controls.visible).toBe(true);
  });

  it("forgets its timer once disposed", () => {
    const { scheduler, controls } = setUp();
    controls.setPlaying(true);

    controls.dispose();

    expect(scheduler.pending).toBe(0);
  });
});
