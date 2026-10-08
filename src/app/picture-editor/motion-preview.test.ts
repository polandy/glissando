import { describe, expect, it } from "vitest";
import { FakeClock, FakeFrameScheduler } from "../../player/testing/fakes";
import { LOOP_HOLD_MS, MotionPreview, type MotionPreviewState } from "./motion-preview";

const SLIDE_MS = 5000;

function preview(playing = true) {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const motion = new MotionPreview({ durationMs: SLIDE_MS, playing }, { clock, frames });
  const seen: MotionPreviewState[] = [];
  motion.subscribe((state) => seen.push(state));
  const after = (ms: number) => {
    clock.advance(ms);
    frames.runFrame();
  };
  return { motion, frames, seen, after };
}

describe("MotionPreview", () => {
  it("plays the motion over the slide's duration, frame by frame", () => {
    const { motion, after } = preview();

    after(1250);

    expect(motion.state).toEqual({ playing: true, progress: 0.25 });
  });

  it("holds the end briefly, then loops from the start", () => {
    const { motion, after } = preview();

    after(SLIDE_MS + LOOP_HOLD_MS / 2);
    expect(motion.state.progress).toBe(1);

    after(LOOP_HOLD_MS / 2 + 500);
    expect(motion.state.progress).toBeCloseTo(0.1);
  });

  it("paused, stays where it is and asks for no more frames", () => {
    const { motion, frames, after } = preview();
    after(1000);

    motion.pause();
    after(2000);

    expect(motion.state).toEqual({ playing: false, progress: 0.2 });
    expect(frames.hasPendingFrame).toBe(false);
  });

  it("played again after a pause, goes on from where it stopped", () => {
    const { motion, after } = preview();
    after(1000);
    motion.pause();
    after(3000);

    motion.play();
    after(500);

    expect(motion.state.progress).toBeCloseTo(0.3);
  });

  it("held at a frame, pauses there; played again, starts from the beginning", () => {
    const { motion, after } = preview();
    after(1000);

    motion.holdAt(1);
    expect(motion.state).toEqual({ playing: false, progress: 1 });

    motion.play();
    after(500);
    expect(motion.state).toEqual({ playing: true, progress: 0.1 });
  });

  it("can start paused, for reduced motion, without asking for a frame", () => {
    const { motion, frames } = preview(false);

    expect(motion.state).toEqual({ playing: false, progress: 0 });
    expect(frames.hasPendingFrame).toBe(false);
  });

  it("tells its subscribers every change", () => {
    const { motion, seen, after } = preview();

    after(1000);
    motion.pause();

    expect(seen.at(-2)).toEqual({ playing: true, progress: 0.2 });
    expect(seen.at(-1)).toEqual({ playing: false, progress: 0.2 });
  });

  it("disposed, asks for no more frames", () => {
    const { motion, frames } = preview();

    motion.dispose();

    expect(frames.hasPendingFrame).toBe(false);
  });
});
