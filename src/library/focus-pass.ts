import { FOCUS_DETECTOR_VERSION } from "../focus/focus-detector-version";
import { FocusDetectorGoneError } from "./focus-detector";
import { FocusPassQueue } from "./focus-pass-queue";
import { scanForOutdatedFocus, takeUpForcedPictures } from "./focus-pass-scan";
import {
  FocusDetectionFailedError,
  IDLE,
  type FocusPassPorts,
  type FocusPassState,
} from "./focus-pass-types";
import type { PictureFocus } from "./picture-focus";
import { MediaNotFoundError } from "./library-store";

export type { FocusPassPorts, FocusPassState, SlideshowSearch } from "./focus-pass-types";
export { FocusDetectionFailedError } from "./focus-pass-types";

/**
 * Looks, in the background, for the focus of every stored picture whose record is missing or
 * outdated (ADR-0012, ADR-0041): one picture at a time, so the device stays responsive, its
 * thumbnail through the detector into the store, with the detector version that found it. A
 * picture whose media is gone meanwhile is skipped; one whose detection fails is logged and left
 * for the next pass. A detector gone ends the pass, the rest left for the next. `lookAgain` asks
 * for specific pictures regardless of their record, ahead of the background scan.
 */
export class FocusPass {
  readonly #ports: FocusPassPorts;
  readonly #listeners = new Set<(state: FocusPassState) => void>();
  readonly #queue = new FocusPassQueue();
  #state = IDLE;
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
    this.#queue.requestRescan();
    this.#launch();
  }

  /**
   * Looks again at these pictures regardless of their record, ahead of the background queue. One
   * already queued moves to the front instead of being queued twice; a slideshow-wide look-again
   * is the caller passing all its picture ids.
   */
  lookAgain(pictureIds: readonly string[]): void {
    if (pictureIds.length === 0) {
      return;
    }
    this.#queue.requestLookAgain(pictureIds);
    this.#launch();
  }

  /** Resolves once the pass has ended; its errors went to `reportError`. */
  settled(): Promise<void> {
    return this.#running;
  }

  #launch(): void {
    if (this.#isRunning) {
      return;
    }
    this.#isRunning = true;
    this.#publish({ running: true, paused: false });
    this.#running = this.#run();
  }

  async #run(): Promise<void> {
    try {
      while (this.#queue.hasWork) {
        const forced = this.#queue.takeForcedRequest();
        if (forced !== undefined) {
          const paused = await this.#guarded(
            async () => {
              await takeUpForcedPictures(this.#ports, this.#queue, forced);
              this.#publishProgress();
            },
            () => this.#queue.requestLookAgain(forced),
          );
          if (paused) {
            return;
          }
          continue;
        }
        if (this.#queue.needsScan) {
          this.#queue.clearRescanRequest();
          if (
            await this.#guarded(
              async () => {
                await scanForOutdatedFocus(this.#ports, this.#queue);
                this.#publishProgress();
              },
              () => this.#queue.requestRescan(),
            )
          ) {
            return;
          }
          continue;
        }
        if (await this.#takeNext()) {
          return; // paused: the queue and progress stay as they are.
        }
      }
    } catch (error) {
      this.#ports.reportError(error);
    } finally {
      this.#isRunning = false;
      if (this.#state.paused) {
        this.#publish({ running: false });
      } else {
        this.#queue.reset();
        this.#publish({ running: false, ...this.#queue.progressSnapshot() });
      }
    }
  }

  /**
   * Runs `step` (a scan or a forced-lookup fetch); resolves true when a `pausesOn` error paused
   * the pass, having first restored the request `step` was serving so nothing it asked for is lost.
   */
  async #guarded(step: () => Promise<void>, restore: () => void): Promise<boolean> {
    try {
      await step();
      return false;
    } catch (error) {
      if (this.#ports.pausesOn?.(error) !== true) {
        throw error;
      }
      this.#ports.log(error);
      restore();
      this.#publish({ paused: true });
      return true;
    }
  }

  /** Takes the next queued picture up; resolves true when a `pausesOn` error paused the pass. */
  async #takeNext(): Promise<boolean> {
    const pictureId = this.#queue.beginNext();
    if (pictureId === undefined) {
      return false;
    }
    const paused = await this.#lookAt(pictureId);
    this.#queue.endCurrent();
    if (paused) {
      this.#queue.requeueFront(pictureId);
      this.#publish({ paused: true });
      return true;
    }
    this.#queue.markDone(pictureId);
    this.#publishProgress();
    return false;
  }

  /** Looks at one picture; resolves true when a `pausesOn` error means the pass should pause. */
  async #lookAt(pictureId: string): Promise<boolean> {
    let input: PictureFocus | Blob;
    try {
      input = await this.#readInput(pictureId);
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        return false;
      }
      if (this.#ports.pausesOn?.(error) === true) {
        this.#ports.log(error);
        return true;
      }
      if (this.#ports.failsPictureOn?.(error) === true) {
        this.#ports.log(new FocusDetectionFailedError(pictureId, error));
        this.#setFailed(pictureId, true);
        return false;
      }
      throw error;
    }
    let focus: PictureFocus;
    if (!(input instanceof Blob)) {
      focus = input;
    } else {
      try {
        focus = await this.#ports.detector.detect(input);
      } catch (error) {
        if (error instanceof FocusDetectorGoneError) {
          // Every later detection would fail alike: the pass ends, the rest waits for the next.
          throw error;
        }
        this.#ports.log(new FocusDetectionFailedError(pictureId, error));
        this.#setFailed(pictureId, true);
        return false;
      }
    }
    try {
      // The store keeps nothing for a picture deleted meanwhile.
      await this.#ports.store.putPictureFocus(pictureId, {
        focus,
        detector: FOCUS_DETECTOR_VERSION,
      });
    } catch (error) {
      if (this.#ports.pausesOn?.(error) === true) {
        this.#ports.log(error);
        return true;
      }
      throw error;
    }
    this.#setFailed(pictureId, false);
    this.#publish({ found: new Map(this.#state.found).set(pictureId, focus) });
    return false;
  }

  /** What to detect on, or the focus already known without detecting (ADR-0041). */
  #readInput(pictureId: string): Promise<PictureFocus | Blob> {
    const { store } = this.#ports;
    return store.detectionInput !== undefined
      ? store.detectionInput(pictureId)
      : store.thumbnailBlob(pictureId);
  }

  #setFailed(pictureId: string, failed: boolean): void {
    if (this.#state.failed.has(pictureId) === failed) {
      return;
    }
    const next = new Set(this.#state.failed);
    if (failed) {
      next.add(pictureId);
      this.#queue.recordFailed(pictureId);
    } else {
      next.delete(pictureId);
      this.#queue.clearFailed(pictureId);
    }
    this.#publish({ failed: next });
  }

  #publishProgress(): void {
    this.#publish(this.#queue.progressSnapshot());
  }

  #publish(change: Partial<FocusPassState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
