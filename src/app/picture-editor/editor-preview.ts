import { transitionDurationMs } from "../../compose";
import type { TransitionChoice } from "../../library/own-timing";
import type { FrameKey } from "./frame-keys";
import type { MotionPreview } from "./motion-preview";
import { previewPlan, transitionHoldMs, transitionLeadInMs } from "./timing/preview-timeline";

/** What the picture editor's preview shows in answer to an edit; reduced motion rests instead. */
export class EditorPreview {
  readonly #motion: MotionPreview;
  readonly #reducedMotion: boolean;

  constructor(motion: MotionPreview, reducedMotion: boolean) {
    this.#motion = motion;
    this.#reducedMotion = reducedMotion;
  }

  /** Editing a frame shows its end in the preview: the start at 0, the end at 1. */
  showFrame(key: FrameKey): void {
    this.#motion.holdAt(key === "from" ? 0 : 1);
  }

  /** After a swap or a reset the whole new motion plays. */
  replay(): void {
    if (this.#reducedMotion) {
      this.#motion.holdAt(0);
    } else {
      this.#motion.restart();
    }
  }

  /** A new duration plays from the start. */
  retime(durationMs: number): void {
    this.#motion.retime(durationMs);
    this.replay();
  }

  /**
   * A transition picked (or reset) plays from a moment before it, or rests half-way through.
   * Built from `choice` explicitly, not the picture: right after the pick it may not carry the
   * new transition yet.
   */
  showTransition(
    choice: TransitionChoice,
    picture: { readonly durationMs: number; readonly next: { readonly durationMs: number } | null },
  ): void {
    const plan = previewPlan({
      durationMs: picture.durationMs,
      transition: { choice, durationMs: transitionDurationMs(picture.durationMs) },
      next: picture.next,
    });
    if (this.#reducedMotion) {
      this.#motion.restAt(transitionHoldMs(plan));
    } else {
      this.#motion.playFrom(transitionLeadInMs(plan));
    }
  }
}
