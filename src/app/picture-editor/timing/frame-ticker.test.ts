import { describe, expect, it } from "vitest";
import { FakeClock, FakeFrameScheduler } from "../../../player/testing/fakes";
import { FrameTicker } from "./frame-ticker";

function ticker() {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const seen: number[] = [];
  const ticking = new FrameTicker({ clock, frames }, (elapsedMs) => seen.push(elapsedMs));
  const after = (ms: number) => {
    clock.advance(ms);
    frames.runFrame();
  };
  return { ticking, frames, seen, after };
}

describe("FrameTicker", () => {
  it("tells the time since it started, once per frame", () => {
    const { seen, after } = ticker();

    after(16);
    after(20);

    expect(seen).toEqual([0, 16, 36]);
  });

  it("stopped, asks for no more frames", () => {
    const { ticking, frames } = ticker();

    ticking.stop();

    expect(frames.hasPendingFrame).toBe(false);
  });
});
