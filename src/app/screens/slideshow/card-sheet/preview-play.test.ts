import { describe, expect, it } from "vitest";
import { FakeClock, FakeFrameScheduler } from "../../../../player/testing/fakes";
import { PreviewPlayer } from "./preview-play";

function setUp() {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const seen: number[] = [];
  const player = new PreviewPlayer();
  const after = (ms: number) => {
    clock.advance(ms);
    frames.runFrame();
  };
  return { clock, frames, seen, player, after };
}

describe("PreviewPlayer", () => {
  it("plays from 0, one tick per frame", () => {
    const { seen, player, frames, clock, after } = setUp();

    player.play({ clock, frames }, 1000, (ms) => seen.push(ms));
    expect(seen).toEqual([0]);
    after(16);
    expect(seen).toEqual([0, 16]);
  });

  it("caps every tick at the target, never drawing a frame past it", () => {
    const { player, frames, clock, seen, after } = setUp();

    player.play({ clock, frames }, 1000, (ms) => seen.push(ms));
    after(1600);

    expect(seen.at(-1)).toBe(1000);
  });

  it("stops asking for frames once the target is reached", async () => {
    const { player, frames, clock, after } = setUp();

    player.play({ clock, frames }, 1000, () => {});
    after(1600);
    // The ticker schedules one more frame right after the tick that reached the target;
    // stopping it happens a microtask later, once that frame actually exists to cancel.
    await Promise.resolve();

    expect(frames.hasPendingFrame).toBe(false);
  });

  it("starting a new play discards the one still running", () => {
    const { player, frames, clock, seen, after } = setUp();

    player.play({ clock, frames }, 1000, (ms) => seen.push(ms));
    after(16);
    seen.length = 0;
    player.play({ clock: new FakeClock(), frames }, 500, (ms) => seen.push(ms));

    expect(seen).toEqual([0]);
  });

  it("stop() leaves no frame pending", () => {
    const { player, frames, clock } = setUp();

    player.play({ clock, frames }, 1000, () => {});
    player.stop();

    expect(frames.hasPendingFrame).toBe(false);
  });
});
