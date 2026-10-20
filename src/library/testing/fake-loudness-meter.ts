import type { MusicLoudness } from "../../loudness";
import type { LoudnessMeter } from "../loudness-meter";

/**
 * An in-memory `LoudnessMeter` for tests. Answers from a function of the music file (throwing in
 * it rejects the measurement); `holdNext` keeps one measurement pending so a test can observe the
 * state while it runs, without any timing.
 */
export class FakeLoudnessMeter implements LoudnessMeter {
  #calls = 0;
  #pendingHold: HeldMeasurement | undefined;

  constructor(private readonly answer: (music: Blob) => MusicLoudness) {}

  /** How many measurements were asked for, held ones included. */
  get calls(): number {
    return this.#calls;
  }

  async measure(music: Blob): Promise<MusicLoudness> {
    this.#calls += 1;
    const hold = this.#pendingHold;
    this.#pendingHold = undefined;
    if (hold) {
      hold.begin();
      await hold.released;
    }
    return this.answer(music);
  }

  /** Holds the next call to `measure`; `started` resolves once it runs, `release` lets it answer. */
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

interface HeldMeasurement {
  begin(): void;
  readonly released: Promise<undefined>;
}
