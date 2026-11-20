import type { FocusDetector } from "../focus-detector";
import type { PictureFocus } from "../picture-focus";

/** Settles a detection held by `FakeFocusDetector.holdNext`. */
export interface HeldDetection {
  /** Lets the held detection answer as the answer function says. */
  release(): void;
  /** Rejects the held detection, as a worker failure would. */
  fail(error: Error): void;
}

/**
 * An in-memory `FocusDetector` for tests. Answers from a function of the thumbnail (throwing in it
 * rejects the detection); `holdNext` keeps one detection pending so a test can observe the state
 * while a search runs, without any timing. A measurement answers `SHARPNESS` unless `checkDisplay`
 * throws.
 */
export class FakeFocusDetector implements FocusDetector {
  static readonly SHARPNESS = 42;
  /** The display handed to each detection, absent ones included. */
  readonly displays: Array<Blob | undefined> = [];
  readonly measured: Array<{ display: Blob; focus: PictureFocus }> = [];
  #calls = 0;
  #pendingHold: Promise<undefined> | undefined;

  constructor(
    private readonly answer: (thumbnail: Blob) => PictureFocus,
    private readonly checkDisplay: (display: Blob) => void = () => undefined,
  ) {}

  /** How many detections were asked for, held ones included. */
  get calls(): number {
    return this.#calls;
  }

  async detect(thumbnail: Blob, display?: Blob): Promise<PictureFocus> {
    this.#calls += 1;
    this.displays.push(display);
    const hold = this.#pendingHold;
    this.#pendingHold = undefined;
    if (hold) await hold;
    return this.answer(thumbnail);
  }

  async measure(display: Blob, focus: PictureFocus): Promise<PictureFocus> {
    this.measured.push({ display, focus });
    this.checkDisplay(display);
    return { ...focus, sharpness: FakeFocusDetector.SHARPNESS };
  }

  /** Holds the next call to `detect` until the returned handle settles it. */
  holdNext(): HeldDetection {
    const { promise, resolve, reject } = Promise.withResolvers<undefined>();
    this.#pendingHold = promise;
    return { release: () => resolve(undefined), fail: (error) => reject(error) };
  }
}
