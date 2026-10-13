import type { PlaybackQuality } from "../../settings/playback-quality";
import type { SlideBoundaries } from "../slide-boundaries";
import { planPreload } from "./preload-plan";
import { PreparedPictures, type PrepareRendition } from "./prepared-pictures";

/** The pictures timed before the plan is made. */
export const MEASURED_PICTURES = 2;
/** Prepared renditions held at most: a 4K one is 1–2 MB, so this stays well within memory. */
export const PREPARED_PICTURES_LIMIT = 60;

/** Where a server slideshow is before and as it plays (`dev-docs/app/PREPARING.md`). */
export type PrepareView =
  | {
      readonly stage: "measuring";
      readonly quality: PlaybackQuality;
      readonly measured: number;
      readonly measuring: number;
    }
  | {
      readonly stage: "preparing";
      readonly quality: PlaybackQuality;
      /** The pictures ready, in order, of the `target` to be ready before playing. */
      readonly ready: number;
      readonly target: number;
      readonly pictureCount: number;
      readonly secondsPerPicture: number;
      /** The slides' average length. */
      readonly secondsPerSlide: number;
      readonly secondsLeft: number;
    }
  | { readonly stage: "playing"; readonly quality: PlaybackQuality }
  | { readonly stage: "failed"; readonly error: unknown };

/** What the prepare screen shows: the flow before it plays or fails. */
export type PreparingView = Extract<PrepareView, { readonly stage: "measuring" | "preparing" }>;

export interface PrepareFlowOptions {
  /** The pictures in play order, those known missing left out. */
  readonly ids: readonly string[];
  readonly quality: PlaybackQuality;
  readonly renditionFor: (quality: PlaybackQuality) => PrepareRendition;
  /** Monotonic milliseconds. */
  readonly clock: () => number;
  /** A picture found missing before playing; the player handles one found later. */
  readonly onMissing: (id: string) => void;
}

/**
 * Prepares a server slideshow's pictures before it plays: times the first ones, works out from
 * the slides how many must be ready to never fall behind (`planPreload`), and plays once they
 * are, or when asked. Preparing goes on behind the slides; the player opens its pictures here.
 */
export class PrepareFlow {
  readonly #options: PrepareFlowOptions;
  readonly #listeners = new Set<(view: PrepareView) => void>();
  readonly #reported = new Set<string>();
  #quality: PlaybackQuality;
  #pictures: PreparedPictures;
  #slides: SlideBoundaries | null = null;
  #playing = false;
  #view: PrepareView;

  constructor(options: PrepareFlowOptions) {
    this.#options = options;
    this.#quality = options.quality;
    this.#pictures = this.#prepare();
    this.#view = this.#viewNow();
  }

  get view(): PrepareView {
    return this.#view;
  }

  /** Called with the current view at once, then with every change; returns the unsubscribe. */
  subscribe(listener: (view: PrepareView) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#view);
    return () => this.#listeners.delete(listener);
  }

  /** The played slides, once composed; again when a missing picture left the slideshow. */
  setSlides(slides: SlideBoundaries): void {
    this.#slides = slides;
    this.#update();
  }

  startNow(): void {
    this.#playing = true;
    this.#update();
  }

  /** Plays this time from Immich's preview, the setting untouched. */
  playInPreview(): void {
    this.#pictures.close();
    this.#quality = "1440";
    this.#pictures = this.#prepare();
    this.#update();
  }

  openPicture(id: string): Promise<Blob> {
    return this.#pictures.open(id);
  }

  /** `id`'s slide is on screen: the renditions before it are released. */
  slidePassed(id: string): void {
    this.#pictures.passed(id);
  }

  close(): void {
    this.#pictures.close();
  }

  #prepare(): PreparedPictures {
    const pictures = new PreparedPictures({
      ids: this.#options.ids,
      prepare: this.#options.renditionFor(this.#quality),
      clock: this.#options.clock,
      capacity: PREPARED_PICTURES_LIMIT,
      onChange: () => {
        if (pictures === this.#pictures) this.#update();
      },
    });
    pictures.start();
    return pictures;
  }

  #update(): void {
    if (!this.#playing) this.#reportMissing();
    const view = this.#viewNow();
    if (view.stage === "playing") this.#playing = true;
    if (JSON.stringify(view) === JSON.stringify(this.#view)) return;
    this.#view = view;
    for (const listener of this.#listeners) listener(view);
  }

  #reportMissing(): void {
    for (const id of this.#pictures.missing()) {
      if (this.#reported.has(id)) continue;
      this.#reported.add(id);
      this.#options.onMissing(id);
    }
  }

  #viewNow(): PrepareView {
    const quality = this.#quality;
    if (this.#playing) return { stage: "playing", quality };
    const failure = this.#pictures.failure();
    if (failure !== null) return { stage: "failed", error: failure };
    const ready = this.#pictures.readyInOrder();
    const pictureCount =
      this.#slides?.starts.length ?? this.#options.ids.length - this.#pictures.missing().size;
    const measuring = Math.min(MEASURED_PICTURES, pictureCount);
    const secondsPerPicture = this.#pictures.secondsPerPicture();
    if (this.#slides === null || secondsPerPicture === null || ready < measuring) {
      return { stage: "measuring", quality, measured: Math.min(ready, measuring), measuring };
    }
    const target = Math.min(
      planPreload(secondsPerPicture, this.#slides.starts).preloadCount,
      PREPARED_PICTURES_LIMIT,
    );
    if (ready >= target) return { stage: "playing", quality };
    return {
      stage: "preparing",
      quality,
      ready,
      target,
      pictureCount,
      secondsPerPicture,
      secondsPerSlide: this.#slides.duration / pictureCount,
      secondsLeft: (target - ready) * secondsPerPicture,
    };
  }
}
