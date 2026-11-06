import type { MusicAnalyser, MusicAnalysis } from "../music-analyser";

/**
 * An in-memory `MusicAnalyser` for tests. Answers from a function of the music file (throwing in
 * it rejects the analysis); `holdNext` keeps one analysis pending so a test can observe the state
 * while it runs, without any timing.
 */
export class FakeMusicAnalyser implements MusicAnalyser {
  #calls = 0;
  #pendingHold: HeldAnalysis | undefined;

  constructor(private readonly answer: (music: Blob) => MusicAnalysis) {}

  /** How many analyses were asked for, held ones included. */
  get calls(): number {
    return this.#calls;
  }

  async analyse(music: Blob): Promise<MusicAnalysis> {
    this.#calls += 1;
    const hold = this.#pendingHold;
    this.#pendingHold = undefined;
    if (hold) {
      hold.begin();
      await hold.released;
    }
    return this.answer(music);
  }

  /** Holds the next call to `analyse`; `started` resolves once it runs, `release` lets it answer. */
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

interface HeldAnalysis {
  begin(): void;
  readonly released: Promise<undefined>;
}
