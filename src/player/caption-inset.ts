import { CaptionGlide } from "./caption-glide";
import type { Clock, FrameScheduler } from "./ports";

/** What the caption inset needs from its player to draw a glide. */
export interface CaptionInsetHost {
  readonly clock: Clock;
  readonly frames: FrameScheduler;
  /** True while playback has a frame of its own due, which draws the glide as well. */
  isPlaybackDrawing(): boolean;
  redraw(): void;
}

/**
 * The player's caption inset in CSS pixels: glides to each new value, drawing frames of its own
 * while the player is paused and stopping once the glide is done.
 */
export class CaptionInset {
  readonly #glide = new CaptionGlide();
  readonly #host: CaptionInsetHost;
  #frameHandle: number | null = null;

  constructor(host: CaptionInsetHost) {
    this.#host = host;
  }

  get target(): number {
    return this.#glide.target;
  }

  /** Where captions sit now, part way through a glide. */
  get current(): number {
    return this.#glide.valueAt(this.#host.clock.now());
  }

  glideTo(cssPixels: number): void {
    assertCaptionInset(cssPixels);
    this.#glide.glideTo(cssPixels, this.#host.clock.now());
    this.follow();
  }

  jumpTo(cssPixels: number): void {
    assertCaptionInset(cssPixels);
    this.#glide.jumpTo(cssPixels);
    this.#host.redraw();
  }

  /** Draws the rest of a glide while playback draws no frames; called when playback stops. */
  follow(): void {
    const idle = this.#frameHandle === null && !this.#host.isPlaybackDrawing();
    if (!idle || !this.#glide.isGlidingAt(this.#host.clock.now())) {
      return;
    }
    this.#frameHandle = this.#host.frames.request(() => {
      this.#frameHandle = null;
      if (!this.#host.isPlaybackDrawing()) {
        this.#host.redraw();
        this.follow();
      }
    });
  }

  dispose(): void {
    if (this.#frameHandle !== null) {
      this.#host.frames.cancel(this.#frameHandle);
      this.#frameHandle = null;
    }
  }
}

function assertCaptionInset(cssPixels: number): void {
  if (!Number.isFinite(cssPixels) || cssPixels < 0) {
    throw new RangeError(`captionInset: expected CSS pixels ≥ 0, got ${cssPixels}`);
  }
}
