import { FocusDetectorGoneError, type FocusDetector } from "./focus-detector";
import type { PictureFocus } from "./picture-focus";
import { MediaNotFoundError, type LibraryStore } from "./stored-slideshow";

export interface FocusPassPorts {
  readonly store: Pick<
    LibraryStore,
    "listSlideshows" | "pictureFocus" | "thumbnailBlob" | "putPictureFocus"
  >;
  readonly detector: FocusDetector;
  /** A detection failed for one picture: logged, the pass carries on. */
  log(error: unknown): void;
  /** An unexpected error, or the detector gone, ended the pass. */
  reportError(error: unknown): void;
}

/** How far the pass is with one slideshow's pictures. */
export interface SlideshowSearch {
  readonly done: number;
  /** The pictures it had no focus for when the pass took it up. */
  readonly total: number;
}

export interface FocusPassState {
  readonly running: boolean;
  /** Each slideshow with pictures still to look at, by slideshow id. */
  readonly slideshows: ReadonlyMap<string, SlideshowSearch>;
  /** The pictures the pass will still look at, the one in flight included. */
  readonly searching: ReadonlySet<string>;
  /** Every focus the pass stored since the app opened, by picture id. */
  readonly found: ReadonlyMap<string, PictureFocus>;
}

/** The detector failed on one picture; it is looked at again on the next pass. */
export class FocusDetectionFailedError extends Error {
  constructor(
    readonly pictureId: string,
    cause: unknown,
  ) {
    super(`finding the focus of picture "${pictureId}" failed`, { cause });
    this.name = "FocusDetectionFailedError";
  }
}

interface Progress {
  readonly pending: Set<string>;
  total: number;
}

const IDLE: FocusPassState = {
  running: false,
  slideshows: new Map(),
  searching: new Set(),
  found: new Map(),
};

/**
 * Looks, in the background, for the focus of every stored picture that has none yet (ADR-0012):
 * one picture at a time, so the device stays responsive, its thumbnail through the detector into
 * the store. A picture whose media is gone meanwhile is skipped; one whose detection fails is
 * logged and left for the next pass. A detector gone ends the pass, the rest left for the next.
 */
export class FocusPass {
  readonly #ports: FocusPassPorts;
  readonly #listeners = new Set<(state: FocusPassState) => void>();
  #state = IDLE;
  #queue: string[] = [];
  /** Pictures taken up in this pass, so a rescan neither queues them twice nor retries a failure. */
  readonly #takenUp = new Set<string>();
  readonly #progress = new Map<string, Progress>();
  #rescanRequested = false;
  #isRunning = false;
  #running: Promise<void> = Promise.resolve();

  constructor(ports: FocusPassPorts) {
    this.#ports = ports;
  }

  get state(): FocusPassState {
    return this.#state;
  }

  /** The Svelte store contract: called now with the current state, then on every change. */
  subscribe(listener: (state: FocusPassState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Starts a pass over every stored slideshow; while one runs, it takes up the slideshows
   * created since it started instead, so two never run at once.
   */
  start(): void {
    this.#rescanRequested = true;
    if (!this.#isRunning) {
      this.#isRunning = true;
      this.#publish({ running: true });
      this.#running = this.#run();
    }
  }

  /** Resolves once the pass has ended; its errors went to `reportError`. */
  settled(): Promise<void> {
    return this.#running;
  }

  async #run(): Promise<void> {
    try {
      while (this.#rescanRequested || this.#queue.length > 0) {
        if (this.#rescanRequested) {
          this.#rescanRequested = false;
          await this.#scan();
          continue;
        }
        const pictureId = this.#queue.shift() as string;
        await this.#lookAt(pictureId);
        this.#done(pictureId);
      }
    } catch (error) {
      this.#ports.reportError(error);
    } finally {
      this.#queue = [];
      this.#takenUp.clear();
      this.#progress.clear();
      this.#isRunning = false;
      this.#publish({ running: false, slideshows: new Map(), searching: new Set() });
    }
  }

  /** Queues every picture without a focus that this pass has not taken up yet, newest slideshow first. */
  async #scan(): Promise<void> {
    const slideshows = await this.#ports.store.listSlideshows();
    const pictureIds = [...new Set(slideshows.flatMap((show) => show.pictures.map((p) => p.id)))];
    const stored = await this.#ports.store.pictureFocus(pictureIds);
    for (const slideshow of slideshows) {
      const toLookAt = slideshow.pictures
        .map((picture) => picture.id)
        .filter((id) => !stored.has(id) && !this.#takenUp.has(id));
      if (toLookAt.length === 0) {
        continue;
      }
      const progress = this.#progress.get(slideshow.id) ?? { pending: new Set(), total: 0 };
      for (const id of toLookAt) {
        this.#takenUp.add(id);
        this.#queue.push(id);
        progress.pending.add(id);
      }
      progress.total += toLookAt.length;
      this.#progress.set(slideshow.id, progress);
    }
    this.#publishProgress();
  }

  async #lookAt(pictureId: string): Promise<void> {
    let thumbnail: Blob;
    try {
      thumbnail = await this.#ports.store.thumbnailBlob(pictureId);
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        return;
      }
      throw error;
    }
    let focus: PictureFocus;
    try {
      focus = await this.#ports.detector.detect(thumbnail);
    } catch (error) {
      if (error instanceof FocusDetectorGoneError) {
        // Every later detection would fail alike: the pass ends, the rest waits for the next.
        throw error;
      }
      this.#ports.log(new FocusDetectionFailedError(pictureId, error));
      return;
    }
    // The store keeps nothing for a picture deleted meanwhile.
    await this.#ports.store.putPictureFocus(pictureId, focus);
    this.#publish({ found: new Map(this.#state.found).set(pictureId, focus) });
  }

  #done(pictureId: string): void {
    for (const [slideshowId, progress] of this.#progress) {
      progress.pending.delete(pictureId);
      if (progress.pending.size === 0) {
        this.#progress.delete(slideshowId);
      }
    }
    this.#publishProgress();
  }

  #publishProgress(): void {
    const slideshows = new Map<string, SlideshowSearch>();
    const searching = new Set<string>();
    for (const [slideshowId, { pending, total }] of this.#progress) {
      slideshows.set(slideshowId, { done: total - pending.size, total });
      pending.forEach((id) => searching.add(id));
    }
    this.#publish({ slideshows, searching });
  }

  #publish(change: Partial<FocusPassState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
