import type { Size } from "./ken-burns";
import type { PictureLoader, SlideRenderer } from "./ports";

/** Slides loaded beyond the last one on screen. */
const SLIDES_PRELOADED_AHEAD = 1;

export class SlideshowLoadError extends Error {
  constructor(src: string, cause: unknown) {
    super(`the picture ${src} could not be loaded`, { cause });
    this.name = "SlideshowLoadError";
  }
}

/**
 * Holds the pictures of the slides on screen and the next ones, so memory stays bounded for
 * slideshows of any length.
 */
export class PictureBuffer<Picture extends Size> {
  readonly #sources: readonly string[];
  readonly #loader: PictureLoader<Picture>;
  readonly #renderer: SlideRenderer<Picture>;
  readonly #loading = new Map<number, Promise<void>>();
  readonly #loaded = new Map<number, Picture>();
  #wanted = new Set<number>();

  constructor(
    sources: readonly string[],
    loader: PictureLoader<Picture>,
    renderer: SlideRenderer<Picture>,
  ) {
    this.#sources = sources;
    this.#loader = loader;
    this.#renderer = renderer;
  }

  get(index: number): Picture | undefined {
    return this.#loaded.get(index);
  }

  /**
   * Keeps the slides `onScreen` and the next ones, releasing all others. Resolves once the
   * slides on screen are loaded; rejects with `SlideshowLoadError` if one of them fails.
   */
  keep(onScreen: readonly number[]): Promise<void> {
    const first = Math.min(...onScreen);
    const last = Math.min(this.#sources.length - 1, Math.max(...onScreen) + SLIDES_PRELOADED_AHEAD);
    this.#wanted = new Set(Array.from({ length: last - first + 1 }, (_, offset) => first + offset));
    for (const index of [...this.#loaded.keys()].filter((loaded) => !this.#wanted.has(loaded))) {
      this.#unload(index);
    }
    for (const index of this.#wanted) {
      this.#load(index).catch(ignorePreloadFailure);
    }
    return Promise.all(onScreen.map((index) => this.#load(index))).then(() => undefined);
  }

  clear(): void {
    this.#wanted = new Set();
    for (const index of [...this.#loaded.keys()]) {
      this.#unload(index);
    }
  }

  #load(index: number): Promise<void> {
    const existing = this.#loading.get(index);
    if (existing !== undefined) {
      return existing;
    }
    const src = this.#sources[index];
    if (src === undefined) {
      throw new RangeError(`no slide at index ${index}`);
    }
    const loading = this.#loader.load(src).then(
      (picture) => {
        if (this.#wanted.has(index)) {
          this.#loaded.set(index, picture);
        } else {
          this.#loading.delete(index);
          this.#loader.release(picture);
        }
      },
      (cause: unknown) => {
        this.#loading.delete(index);
        throw new SlideshowLoadError(src, cause);
      },
    );
    this.#loading.set(index, loading);
    return loading;
  }

  #unload(index: number): void {
    const picture = this.#loaded.get(index);
    this.#loaded.delete(index);
    this.#loading.delete(index);
    if (picture !== undefined) {
      this.#renderer.forget(picture);
      this.#loader.release(picture);
    }
  }
}

/** A failed load is forgotten, so it is retried and reported once its slide is on screen. */
function ignorePreloadFailure(): void {
  return;
}
