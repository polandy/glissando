import type { FramePlayer } from "../../player";
import type { FrameSource, FrameTiming } from "../ports";

/** Draws each frame with the player's `renderAt` and captures its canvas as a `VideoFrame`. */
export class CanvasFrameSource implements FrameSource<VideoFrame> {
  readonly #framePlayer: FramePlayer;

  constructor(framePlayer: FramePlayer) {
    this.#framePlayer = framePlayer;
  }

  async frameAt(seconds: number, { timestampUs, durationUs }: FrameTiming): Promise<VideoFrame> {
    await this.#framePlayer.player.renderAt(seconds);
    return new VideoFrame(this.#framePlayer.canvas, {
      timestamp: timestampUs,
      duration: durationUs,
    });
  }
}
