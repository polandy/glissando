import type { Size } from "./ken-burns";
import type { PictureLoader, SlideRenderer } from "./ports";

/** Slides loaded beyond the last one on screen, unless the player is told otherwise. */
export const DEFAULT_PICTURES_AHEAD = 1;

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
  /** One or two sources per slide: its own picture, and its partner's if it is paired. */
  readonly #sources: readonly (readonly string[])[];
  readonly #loader: PictureLoader<Picture>;
  readonly #renderer: SlideRenderer<Picture>;
  readonly #picturesAhead: number;
  readonly #loading = new Map<number, Promise<void>>();
  readonly #loaded = new Map<number, readonly Picture[]>();
  #wanted = new Set<number>();

  constructor(
    sources: readonly (readonly string[])[],
    loader: PictureLoader<Picture>,
    renderer: SlideRenderer<Picture>,
    picturesAhead = DEFAULT_PICTURES_AHEAD,
  ) {
    if (!Number.isInteger(picturesAhead) || picturesAhead < 0) {
      throw new RangeError(
        `picturesAhead is ${picturesAhead}; set a whole number of slides, 0 or more`,
      );
    }
    this.#sources = sources;
    this.#loader = loader;
    this.#renderer = renderer;
    this.#picturesAhead = picturesAhead;
  }

  /** A slide's own picture, and its partner's if it is paired; undefined until both are loaded. */
  get(index: number): readonly Picture[] | undefined {
    return this.#loaded.get(index);
  }

  /** The loaded pictures of the slides after the last one `onScreen`, nearest first. */
  loadedAfter(
    onScreen: readonly number[],
  ): { readonly index: number; readonly pictures: readonly Picture[] }[] {
    const lastOnScreen = Math.max(...onScreen);
    return [...this.#loaded]
      .filter(([index]) => index > lastOnScreen)
      .sort(([left], [right]) => left - right)
      .map(([index, pictures]) => ({ index, pictures }));
  }

  /**
   * Keeps the slides `onScreen` and the next ones, releasing all others. Resolves once the
   * slides on screen are loaded; rejects with `SlideshowLoadError` if one of them fails.
   */
  keep(onScreen: readonly number[]): Promise<void> {
    const first = Math.min(...onScreen);
    const last = Math.min(this.#sources.length - 1, Math.max(...onScreen) + this.#picturesAhead);
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
    const srcs = this.#sources[index];
    if (srcs === undefined) {
      throw new RangeError(`no slide at index ${index}`);
    }
    const loading = Promise.all(srcs.map((src) => this.#loadOne(src))).then(
      (pictures) => {
        if (this.#wanted.has(index)) {
          this.#loaded.set(index, pictures);
        } else {
          this.#loading.delete(index);
          pictures.forEach((picture) => this.#loader.release(picture));
        }
      },
      (error: unknown) => {
        this.#loading.delete(index);
        throw error;
      },
    );
    this.#loading.set(index, loading);
    return loading;
  }

  #loadOne(src: string): Promise<Picture> {
    return this.#loader.load(src).catch((cause: unknown) => {
      throw new SlideshowLoadError(src, cause);
    });
  }

  #unload(index: number): void {
    const pictures = this.#loaded.get(index);
    this.#loaded.delete(index);
    this.#loading.delete(index);
    pictures?.forEach((picture) => {
      this.#renderer.forget(picture);
      this.#loader.release(picture);
    });
  }
}

/** A failed load is forgotten, so it is retried and reported once its slide is on screen. */
function ignorePreloadFailure(): void {
  return;
}
