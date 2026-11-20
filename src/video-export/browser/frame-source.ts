import type { FramePlayer } from "../../player";
import type { FrameSource, FrameTiming } from "../ports";

/**
 * Draws each frame with the player's `renderAt` and captures its canvas as a `VideoFrame`.
 * Rejects once the WebGL context is lost, so the export fails rather than encode blank frames.
 */
export class CanvasFrameSource implements FrameSource<VideoFrame> {
  readonly #framePlayer: FramePlayer;

  constructor(framePlayer: FramePlayer) {
    this.#framePlayer = framePlayer;
  }

  async frameAt(seconds: number, { timestampUs, durationUs }: FrameTiming): Promise<VideoFrame> {
    await this.#framePlayer.player.renderAt(seconds);
    if (this.#framePlayer.isContextLost()) {
      throw new Error("the WebGL context was lost while drawing the video");
    }
    return new VideoFrame(this.#framePlayer.canvas, {
      timestamp: timestampUs,
      duration: durationUs,
    });
  }
}
