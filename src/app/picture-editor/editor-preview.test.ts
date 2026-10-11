import { describe, expect, it } from "vitest";
import { transitionDurationMs } from "../../compose";
import { CUT_TRANSITION } from "../../library/own-timing";
import { FakeClock, FakeFrameScheduler } from "../../player/testing/fakes";
import { EditorPreview } from "./editor-preview";
import { MotionPreview } from "./motion-preview";
import { TRANSITION_LEAD_MS } from "./timing/preview-timeline";

const SLIDE_MS = 5000;
const NEXT = { durationMs: 4000 };

function editorPreview(reducedMotion = false) {
  const clock = new FakeClock();
  const motion = new MotionPreview(
    { durationMs: SLIDE_MS, playing: false },
    { clock, frames: new FakeFrameScheduler() },
  );
  return { motion, preview: new EditorPreview(motion, reducedMotion) };
}

describe("EditorPreview", () => {
  it("holds on the start frame while it is edited, and on the end frame for the end", () => {
    const { motion, preview } = editorPreview();

    preview.showFrame("from");
    expect(motion.state).toEqual({ playing: false, elapsedMs: 0, onFrame: true });

    preview.showFrame("to");
    expect(motion.state).toEqual({ playing: false, elapsedMs: SLIDE_MS, onFrame: true });
  });

  it("plays the whole new motion from the start after a swap or a reset", () => {
    const { motion, preview } = editorPreview();

    preview.replay();

    expect(motion.state).toEqual({ playing: true, elapsedMs: 0, onFrame: false });
  });

  it("holds on the start frame instead of replaying when motion is reduced", () => {
    const { motion, preview } = editorPreview(true);

    preview.replay();

    expect(motion.state).toEqual({ playing: false, elapsedMs: 0, onFrame: true });
  });

  it("plays a picked transition from a moment before it", () => {
    const { motion, preview } = editorPreview();

    preview.showTransition("crossfade", { durationMs: SLIDE_MS, next: NEXT });

    const leadInMs = SLIDE_MS - transitionDurationMs(SLIDE_MS) - TRANSITION_LEAD_MS;
    expect(motion.state).toEqual({ playing: true, elapsedMs: leadInMs, onFrame: false });
  });

  it("rests half-way through a picked transition when motion is reduced", () => {
    const { motion, preview } = editorPreview(true);

    preview.showTransition("crossfade", { durationMs: SLIDE_MS, next: NEXT });

    const halfWayMs = SLIDE_MS - transitionDurationMs(SLIDE_MS) / 2;
    expect(motion.state).toEqual({ playing: false, elapsedMs: halfWayMs, onFrame: false });
  });

  it("rests at the cut itself when the cut is picked and motion is reduced", () => {
    const { motion, preview } = editorPreview(true);

    preview.showTransition(CUT_TRANSITION, { durationMs: SLIDE_MS, next: NEXT });

    expect(motion.state).toEqual({ playing: false, elapsedMs: SLIDE_MS, onFrame: false });
  });

  it("plays a new duration from the start", () => {
    const { motion, preview } = editorPreview();

    preview.retime(8000);
    expect(motion.state).toEqual({ playing: true, elapsedMs: 0, onFrame: false });

    preview.showFrame("to");
    expect(motion.state.elapsedMs).toBe(8000);
  });
});
