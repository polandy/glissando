import type { LiveFrame } from "../ports";

/**
 * A video slide's clip element in the DOM fallback: the element itself is shown, sized and
 * transformed exactly as its poster `<img>`, right after it so the caption and card stay above
 * it. The poster stays underneath until the clip has a frame (ADR-0035).
 */
export class LiveVideos {
  readonly #byPoster = new Map<HTMLImageElement, HTMLVideoElement>();

  /** True for a clip element this class placed, which the render loop's sweep must not remove. */
  owns(node: ChildNode): boolean {
    return node instanceof HTMLVideoElement && [...this.#byPoster.values()].includes(node);
  }

  /** Shows `live` over `poster` when it is a clip element, else drops the clip shown there. */
  place(poster: HTMLImageElement, live: LiveFrame | undefined): void {
    if (!(live instanceof HTMLVideoElement)) {
      this.forget(poster);
      return;
    }
    const shown = this.#byPoster.get(poster);
    if (shown !== undefined && shown !== live) {
      shown.remove();
    }
    this.#byPoster.set(poster, live);
    live.style.cssText = poster.style.cssText;
    live.style.objectFit = "fill";
    if (poster.nextElementSibling !== live) {
      poster.after(live);
    }
  }

  /** Drops the clip element of every poster not in `shown`. */
  sweep(shown: ReadonlySet<HTMLImageElement>): void {
    for (const poster of [...this.#byPoster.keys()]) {
      if (!shown.has(poster)) {
        this.forget(poster);
      }
    }
  }

  forget(poster: HTMLImageElement): void {
    this.#byPoster.get(poster)?.remove();
    this.#byPoster.delete(poster);
  }
}
