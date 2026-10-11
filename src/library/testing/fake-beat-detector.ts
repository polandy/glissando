import type { MusicBeats } from "../../beats";
import type { BeatDetector } from "../beat-detector";

/**
 * An in-memory `BeatDetector` for tests. Answers from a function of the music file (throwing in it
 * rejects the detection); `holdNext` keeps one detection pending so a test can observe the state
 * while it runs, without any timing.
 */
export class FakeBeatDetector implements BeatDetector {
  #calls = 0;
  #pendingHold: HeldDetection | undefined;

  constructor(private readonly answer: (music: Blob) => MusicBeats) {}

  /** How many detections were asked for, held ones included. */
  get calls(): number {
    return this.#calls;
  }

  async detect(music: Blob): Promise<MusicBeats> {
    this.#calls += 1;
    const hold = this.#pendingHold;
    this.#pendingHold = undefined;
    if (hold) {
      hold.begin();
      await hold.released;
    }
    return this.answer(music);
  }

  /** Holds the next call to `detect`; `started` resolves once it runs, `release` lets it answer. */
  holdNext(): { readonly started: Promise<void>; release(): void } {
    const started = Promise.withResolvers<undefined>();
    const released = Promise.withResolvers<undefined>();
    this.#pendingHold = { begin: () => started.resolve(undefined), released: released.promise };
    return {
      started: started.promise.then(() => undefined),
      release: () => released.resolve(undefined),
    };
  }
}

interface HeldDetection {
  begin(): void;
  readonly released: Promise<undefined>;
}
