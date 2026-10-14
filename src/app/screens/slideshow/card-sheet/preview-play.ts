import { FrameTicker } from "../../../picture-editor/timing/frame-ticker";
import type { MotionPreviewPorts } from "../../../picture-editor/motion-preview";

/**
 * Runs a card's timing once, from 0 up to `targetMs`, then stops on its own (TITLE_SLIDES.md,
 * "Only Play and opening the sheet run the timing"). `onTick` always sees the elapsed time
 * capped at `targetMs`, so the last frame it draws is the settled one, never past it.
 */
export class PreviewPlayer {
  #ticker: FrameTicker | null = null;
  #done = false;

  play(ports: MotionPreviewPorts, targetMs: number, onTick: (elapsedMs: number) => void): void {
    this.stop();
    this.#done = false;
    this.#ticker = new FrameTicker(ports, (elapsedMs) => {
      if (this.#done) {
        return;
      }
      onTick(Math.min(elapsedMs, targetMs));
      if (elapsedMs >= targetMs) {
        this.#done = true;
        // The ticker schedules its next frame right after this callback returns, so there is
        // nothing to cancel yet; a microtask later, once it has, `stop()` cancels that frame.
        queueMicrotask(() => this.stop());
      }
    });
  }

  stop(): void {
    this.#done = true;
    this.#ticker?.stop();
    this.#ticker = null;
  }
}
