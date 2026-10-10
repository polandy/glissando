import type { Size } from "./ken-burns";
import { PictureBuffer } from "./picture-buffer";
import type { PictureLoader, SlideRenderer } from "./ports";
import { renderFrame } from "./render-frame";
import type { Slideshow } from "./slideshow";
import type { SlideAtTime, TimelineFrame } from "./timeline";

/**
 * The pictures around the player's current frame: loads those on screen and the next ones, draws
 * the frame, and spreads the work to draw the next ones over the frames before they come on screen.
 */
export class FramePictures<Picture extends Size> {
  readonly #slideshow: Slideshow;
  readonly #currentFrame: () => TimelineFrame;
  readonly #renderer: SlideRenderer<Picture>;
  readonly #buffer: PictureBuffer<Picture>;

  constructor(
    slideshow: Slideshow,
    currentFrame: () => TimelineFrame,
    loader: PictureLoader<Picture>,
    renderer: SlideRenderer<Picture>,
  ) {
    this.#slideshow = slideshow;
    this.#currentFrame = currentFrame;
    this.#renderer = renderer;
    this.#buffer = new PictureBuffer(
      slideshow.slides.map((slide) => slide.image.src),
      loader,
      renderer,
    );
  }

  get(index: number): Picture | undefined {
    return this.#buffer.get(index);
  }

  /** True once every picture on screen is loaded. */
  areOnScreenLoaded(): boolean {
    return this.#onScreen().every((slide) => this.#buffer.get(slide.index) !== undefined);
  }

  /** Loads the pictures on screen and the next ones; resolves once those on screen are loaded. */
  loadAroundScreen(): Promise<void> {
    return this.#buffer.keep(this.#onScreen().map((slide) => slide.index));
  }

  /**
   * Calls `onLoaded` once the pictures on screen are loaded, or `onError` if one of them fails;
   * neither once `isWanted` turned false meanwhile.
   */
  whenOnScreenLoaded(callbacks: {
    readonly isWanted: () => boolean;
    readonly onLoaded: () => void;
    readonly onError: (error: Error) => void;
  }): void {
    this.loadAroundScreen().then(
      () => {
        if (callbacks.isWanted() && this.areOnScreenLoaded()) {
          callbacks.onLoaded();
        }
      },
      (error: unknown) => {
        if (callbacks.isWanted()) {
          callbacks.onError(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );
  }

  /** Draws the current frame; its pictures must be loaded. */
  draw(captionInset: number): void {
    this.#renderer.setCaptionInset(captionInset);
    this.#renderer.render(
      renderFrame(this.#currentFrame(), this.#slideshow, (index) => this.#buffer.get(index)),
    );
  }

  /** Hands the renderer the next step of preparing the loaded pictures after those on screen. */
  prepareUpcoming(): void {
    const onScreen = this.#onScreen().map((slide) => slide.index);
    for (const { index, picture } of this.#buffer.loadedAfter(onScreen)) {
      const caption = this.#slideshow.slides[index]?.caption;
      this.#renderer.prepare(caption === undefined ? { picture } : { picture, caption });
    }
  }

  clear(): void {
    this.#buffer.clear();
  }

  #onScreen(): readonly SlideAtTime[] {
    const frame = this.#currentFrame();
    return frame.kind === "slide" ? [frame.slide] : [frame.from, frame.to];
  }
}
