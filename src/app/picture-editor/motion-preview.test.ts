import { describe, expect, it } from "vitest";
import { FakeClock, FakeFrameScheduler } from "../../player/testing/fakes";
import { MotionPreview, type MotionPreviewState } from "./motion-preview";
import { NEXT_HOLD_MS } from "./timing/preview-timeline";

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
  it("plays over the slide's duration, frame by frame", () => {
    const { motion, after } = preview();

    after(1250);

    expect(motion.state).toEqual({ playing: true, elapsedMs: 1250, onFrame: false });
  });

  it("runs on through the hold on what follows, then loops from the start", () => {
    const { motion, after } = preview();

    after(SLIDE_MS + NEXT_HOLD_MS / 2);
    expect(motion.state.elapsedMs).toBe(SLIDE_MS + NEXT_HOLD_MS / 2);

    after(NEXT_HOLD_MS / 2 + 500);
    expect(motion.state.elapsedMs).toBe(500);
  });

  it("starts over from a given moment, e.g. just before the transition", () => {
    const { motion, after } = preview(false);

    motion.playFrom(3800);
    after(100);

    expect(motion.state).toEqual({ playing: true, elapsedMs: 3900, onFrame: false });
  });

  it("rests at a given moment, paused; played again, goes on from there", () => {
    const { motion, after } = preview();

    motion.restAt(4500);
    expect(motion.state).toEqual({ playing: false, elapsedMs: 4500, onFrame: false });

    motion.play();
    after(100);
    expect(motion.state.elapsedMs).toBe(4600);
  });

  it("takes a new duration and loops over it", () => {
    const { motion, after } = preview();

    motion.retime(2000);
    motion.restart();
    after(2000 + NEXT_HOLD_MS + 300);

    expect(motion.state.elapsedMs).toBe(300);
  });

  it("paused, stays where it is and asks for no more frames", () => {
    const { motion, frames, after } = preview();
    after(1000);

    motion.pause();
    after(2000);

    expect(motion.state).toEqual({ playing: false, elapsedMs: 1000, onFrame: false });
    expect(frames.hasPendingFrame).toBe(false);
  });

  it("played again after a pause, goes on from where it stopped", () => {
    const { motion, after } = preview();
    after(1000);
    motion.pause();
    after(3000);

    motion.play();
    after(500);

    expect(motion.state.elapsedMs).toBe(1500);
  });

  it("held at a frame, pauses on this picture alone; played again, starts from the beginning", () => {
    const { motion, after } = preview();
    after(1000);

    motion.holdAt(1);
    expect(motion.state).toEqual({ playing: false, elapsedMs: SLIDE_MS, onFrame: true });

    motion.play();
    after(500);
    expect(motion.state).toEqual({ playing: true, elapsedMs: 500, onFrame: false });
  });

  it("can start paused, for reduced motion, without asking for a frame", () => {
    const { motion, frames } = preview(false);

    expect(motion.state).toEqual({ playing: false, elapsedMs: 0, onFrame: false });
    expect(frames.hasPendingFrame).toBe(false);
  });

  it("tells its subscribers every change", () => {
    const { motion, seen, after } = preview();

    after(1000);
    motion.pause();

    expect(seen.at(-2)).toEqual({ playing: true, elapsedMs: 1000, onFrame: false });
    expect(seen.at(-1)).toEqual({ playing: false, elapsedMs: 1000, onFrame: false });
  });

  it("disposed, asks for no more frames", () => {
    const { motion, frames } = preview();

    motion.dispose();

    expect(frames.hasPendingFrame).toBe(false);
  });
});
