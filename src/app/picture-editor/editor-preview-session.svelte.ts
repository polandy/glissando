import { EditorPreview } from "./editor-preview";
import { MotionPreview, type MotionPreviewPorts, type MotionPreviewState } from "./motion-preview";

/**
 * The picture editor's running preview: its clock, what it shows in answer to edits, and the
 * clock's state as reactive data. A new duration restarts it; the rest is fixed for its lifetime.
 */
export class EditorPreviewSession {
  readonly clock: MotionPreview;
  readonly answers: EditorPreview;
  state: MotionPreviewState;
  #durationMs: number;

  constructor(durationMs: number, reducedMotion: boolean, ports: MotionPreviewPorts) {
    this.#durationMs = durationMs;
    this.clock = new MotionPreview({ durationMs, playing: !reducedMotion }, ports);
    this.answers = new EditorPreview(this.clock, reducedMotion);
    this.state = $state.raw(this.clock.state);
    this.clock.subscribe((next) => (this.state = next));
  }

  /** Plays the preview again from the start when `durationMs` is not the one it runs. */
  retimeTo(durationMs: number): void {
    if (durationMs === this.#durationMs) return;
    this.#durationMs = durationMs;
    this.answers.retime(durationMs);
  }

  dispose(): void {
    this.clock.dispose();
  }
}
