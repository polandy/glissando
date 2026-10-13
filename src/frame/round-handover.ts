/**
 * Hands playback over from one round's player to the next without the player itself being
 * incremental (`dev-docs/app/FRAME.md`, ADR-0030): the next round is created and started, muted
 * from view, as soon as the current one starts, so by the time it ends the next is usually
 * already showing its first picture; only then is the old one torn down.
 */

/** The player API the hand-over needs; `BrowserPlayer` (src/player) satisfies it. */
export interface FrameRoundPlayer {
  play(): void;
  pause(): void;
  destroy(): void;
  addEventListener(type: "ended" | "playing", listener: () => void): void;
  removeEventListener(type: "ended" | "playing", listener: () => void): void;
}

export type RoundOutcome =
  | { readonly kind: "player"; readonly player: FrameRoundPlayer }
  /** The album has nothing left to compose a round from (`dev-docs/app/FRAME.md`). */
  | { readonly kind: "noPicturesLeft" };

export interface RoundHandoverPorts {
  /** Composes and creates the player for the next round in the deck's order. */
  createNextRound(): RoundOutcome;
}

export interface RoundHandoverState {
  readonly player: FrameRoundPlayer | null;
  readonly paused: boolean;
  /** True once the album has nothing left and no round is left playing. */
  readonly endOfPictures: boolean;
}

/** Keeps exactly one round playing at a time, with the next one prepared ahead of its turn. */
export class RoundHandover {
  readonly #ports: RoundHandoverPorts;
  readonly #listeners = new Set<(state: RoundHandoverState) => void>();
  readonly #onEnded = (): void => this.#swapOrWait();
  readonly #onPreparingReady = (): void => {
    this.#preparingReady = true;
    if (this.#waitingToSwap) {
      this.#swapIn();
    }
  };
  #current: FrameRoundPlayer | null = null;
  #preparing: FrameRoundPlayer | null = null;
  #preparingReady = false;
  #waitingToSwap = false;
  #paused = false;
  #endOfPictures = false;

  constructor(ports: RoundHandoverPorts) {
    this.#ports = ports;
  }

  get state(): RoundHandoverState {
    return { player: this.#current, paused: this.#paused, endOfPictures: this.#endOfPictures };
  }

  /** Called with the current state at once, then with every change; returns the unsubscribe. */
  subscribe(listener: (state: RoundHandoverState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.state);
    return () => this.#listeners.delete(listener);
  }

  /** Starts the first round; a picture frame calls this once, right after construction. */
  start(): void {
    const outcome = this.#ports.createNextRound();
    if (outcome.kind === "noPicturesLeft") {
      this.#endOfPictures = true;
      this.#notify();
      return;
    }
    this.#current = outcome.player;
    this.#current.addEventListener("ended", this.#onEnded);
    this.#current.play();
    this.#notify();
    this.#prepareNext();
  }

  pause(): void {
    this.#current?.pause();
    this.#paused = true;
    this.#notify();
  }

  resume(): void {
    this.#current?.play();
    this.#paused = false;
    this.#notify();
  }

  /** "Next": ends the round early, the same hand-over as a natural end. */
  skip(): void {
    this.#swapOrWait();
  }

  /** Tears down whatever is playing or being prepared; called when the frame is left. */
  destroy(): void {
    this.#current?.removeEventListener("ended", this.#onEnded);
    this.#current?.destroy();
    this.#current = null;
    this.#preparing?.removeEventListener("playing", this.#onPreparingReady);
    this.#preparing?.destroy();
    this.#preparing = null;
  }

  #prepareNext(): void {
    if (this.#preparing !== null) {
      return;
    }
    const outcome = this.#ports.createNextRound();
    if (outcome.kind === "noPicturesLeft") {
      return;
    }
    this.#preparing = outcome.player;
    this.#preparing.addEventListener("playing", this.#onPreparingReady);
    this.#preparing.play();
  }

  /** The round ended (naturally or via `skip`): swaps in the next round if it is ready, else waits. */
  #swapOrWait(): void {
    this.#current?.removeEventListener("ended", this.#onEnded);
    if (this.#preparing === null) {
      // The album had nothing left to prepare when this round started.
      this.#endOfPictures = true;
      this.#notify();
      return;
    }
    if (this.#preparingReady) {
      this.#swapIn();
    } else {
      this.#waitingToSwap = true;
    }
  }

  #swapIn(): void {
    const next = this.#preparing;
    if (next === null) {
      return;
    }
    next.removeEventListener("playing", this.#onPreparingReady);
    this.#current?.destroy();
    this.#current = next;
    this.#current.addEventListener("ended", this.#onEnded);
    this.#preparing = null;
    this.#preparingReady = false;
    this.#waitingToSwap = false;
    this.#notify();
    this.#prepareNext();
  }

  #notify(): void {
    const state = this.state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
